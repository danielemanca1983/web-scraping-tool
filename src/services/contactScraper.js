const axios = require('axios');
const cheerio = require('cheerio');
const { throttledRequest } = require('../utils/rateLimiter');

const USER_AGENT = 'LeadLens/1.0 (local research tool)';
const TIMEOUT = 8000;

const SOCIAL_PATTERNS = {
  linkedin: /linkedin\.com\/(company|in)\//i,
  facebook: /facebook\.com\//i,
  instagram: /instagram\.com\//i,
  twitter: /(?:twitter|x)\.com\//i,
  tiktok: /tiktok\.com\/@/i,
};

function log(msg) {
  console.log(`[${new Date().toISOString()}] [ContactScraper] ${msg}`);
}

function makeClient() {
  return axios.create({
    timeout: TIMEOUT,
    headers: { 'User-Agent': USER_AGENT },
    maxRedirects: 5,
  });
}

async function checkRobotsTxt(baseUrl) {
  try {
    const url = new URL(baseUrl);
    const robotsUrl = `${url.protocol}//${url.host}/robots.txt`;
    const client = makeClient();
    const res = await client.get(robotsUrl);
    return parseRobotsDisallowed(res.data);
  } catch {
    return [];
  }
}

function parseRobotsDisallowed(text) {
  const disallowed = [];
  let inOurAgent = false;

  for (const line of text.split('\n')) {
    const trimmed = line.trim().toLowerCase();
    if (trimmed.startsWith('user-agent:')) {
      const agent = trimmed.replace('user-agent:', '').trim();
      inOurAgent = agent === '*' || agent === 'leadlens';
    } else if (inOurAgent && trimmed.startsWith('disallow:')) {
      const path = trimmed.replace('disallow:', '').trim();
      if (path) disallowed.push(path);
    }
  }

  return disallowed;
}

function isPathAllowed(path, disallowed) {
  return !disallowed.some((d) => path.startsWith(d));
}

function extractEmails($) {
  const emails = new Set();
  $('a[href^="mailto:"]').each((_, el) => {
    const href = $(el).attr('href') || '';
    const email = href.replace('mailto:', '').split('?')[0].trim().toLowerCase();
    if (email && email.includes('@')) emails.add(email);
  });
  return [...emails];
}

function extractSocialLinks($) {
  const links = { linkedin: null, facebook: null, instagram: null, twitter: null, tiktok: null };

  $('a[href]').each((_, el) => {
    const href = $(el).attr('href') || '';
    for (const [platform, pattern] of Object.entries(SOCIAL_PATTERNS)) {
      if (!links[platform] && pattern.test(href)) {
        links[platform] = href.startsWith('http') ? href : null;
      }
    }
  });

  return links;
}

async function fetchPage(url, client) {
  try {
    const res = await client.get(url);
    return res.data;
  } catch {
    return null;
  }
}

async function scrapeWebsite(websiteUrl) {
  if (!websiteUrl) {
    return { email: null, socialLinks: { linkedin: null, facebook: null, instagram: null, twitter: null, tiktok: null } };
  }

  return throttledRequest(async () => {
    log(`Scraping: ${websiteUrl}`);

    const disallowed = await checkRobotsTxt(websiteUrl);
    log(`Robots.txt disallowed paths: ${disallowed.join(', ') || 'none'}`);

    const client = makeClient();
    const result = { email: null, socialLinks: { linkedin: null, facebook: null, instagram: null, twitter: null, tiktok: null } };

    // Scrape homepage
    if (isPathAllowed('/', disallowed)) {
      const html = await fetchPage(websiteUrl, client);
      if (html) {
        const $ = cheerio.load(html);
        const emails = extractEmails($);
        if (emails.length) result.email = emails[0];
        result.socialLinks = extractSocialLinks($);
      }
    }

    // If no email found, try /contact
    if (!result.email) {
      const contactPath = '/contact';
      if (isPathAllowed(contactPath, disallowed)) {
        try {
          const baseUrl = new URL(websiteUrl);
          const contactUrl = `${baseUrl.protocol}//${baseUrl.host}${contactPath}`;
          log(`Checking contact page: ${contactUrl}`);
          const html = await fetchPage(contactUrl, client);
          if (html) {
            const $ = cheerio.load(html);
            const emails = extractEmails($);
            if (emails.length) result.email = emails[0];
            // Merge social links from contact page
            const contactSocials = extractSocialLinks($);
            for (const [platform, link] of Object.entries(contactSocials)) {
              if (!result.socialLinks[platform] && link) {
                result.socialLinks[platform] = link;
              }
            }
          }
        } catch {
          // ignore URL parse errors
        }
      }
    }

    log(`Result for ${websiteUrl}: email=${result.email}, socials=${JSON.stringify(result.socialLinks)}`);
    return result;
  });
}

module.exports = { scrapeWebsite };
