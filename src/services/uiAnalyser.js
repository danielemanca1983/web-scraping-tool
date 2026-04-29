const puppeteer = require('puppeteer');
const Anthropic = require('@anthropic-ai/sdk');

const client = new Anthropic();

function log(msg) {
  console.log(`[${new Date().toISOString()}] [UIAnalyser] ${msg}`);
}

function parseAnalysisResponse(raw) {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  const jsonText = fenced ? fenced[1].trim() : trimmed;

  try {
    return JSON.parse(jsonText);
  } catch (err) {
    const start = jsonText.indexOf('{');
    const end = jsonText.lastIndexOf('}');
    if (start !== -1 && end > start) {
      return JSON.parse(jsonText.slice(start, end + 1));
    }
    throw err;
  }
}

async function analyseWebsite(websiteUrl) {
  let browser;

  try {
    log(`Launching browser for: ${websiteUrl}`);
    browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
    const page = await browser.newPage();

    // Single desktop viewport, above-the-fold only
    await page.setViewport({ width: 1280, height: 800 });
    await page.goto(websiteUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await new Promise((r) => setTimeout(r, 1500));

    // JPEG at quality 55 — smallest viable size that preserves layout/colour/typography
    const screenshotBuffer = await page.screenshot({
      type: 'jpeg',
      quality: 55,
      fullPage: false,
    });
    const base64 = screenshotBuffer.toString('base64');

    await browser.close();
    browser = null;

    log(`Screenshot taken for ${websiteUrl} (${Math.round(base64.length / 1024)}KB base64)`);

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system: 'You are a CRO and UI specialist. Respond only with valid JSON, no markdown.',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: 'image/jpeg', data: base64 },
            },
            {
              type: 'text',
              text: `Analyse this website screenshot. Return this exact JSON structure:
{
  "overallScore": <1-10>,
  "summary": "<2 sentences>",
  "uiIssues": [{"severity":"high|medium|low","area":"<string>","issue":"<string>","fix":"<string>"}],
  "croIssues": [{"severity":"high|medium|low","area":"<string>","issue":"<string>","fix":"<string>"}],
  "quickWins": ["<string>","<string>","<string>"]
}`,
            },
          ],
        },
      ],
    });

    const raw = response.content.find((b) => b.type === 'text')?.text ?? '{}';
    log(`Claude response received for ${websiteUrl}`);

    const analysis = parseAnalysisResponse(raw);
    return { analysis, screenshot: base64 };
  } catch (err) {
    if (browser) await browser.close();
    log(`Error analysing ${websiteUrl}: ${err.message}`);
    return {
      analysis: {
        overallScore: 0,
        summary: `Could not load ${websiteUrl}. ${err.message}`,
        uiIssues: [],
        croIssues: [],
        quickWins: [],
      },
      screenshot: null,
    };
  }
}

module.exports = { analyseWebsite };
