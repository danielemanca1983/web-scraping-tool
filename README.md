# LeadLens

**Find leads. Fix websites.**

A full-stack local lead generation and website analysis tool. Search for businesses by niche and location, aggregate contact data, and use AI vision to analyse each company's website for UI and CRO issues.

---

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Copy the example env file
cp .env.example .env

# 3. Fill in your API keys in .env (see below)

# 4. Start the dev server
npm run dev

# Production
npm start
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## API Keys

### `GOOGLE_PLACES_API_KEY`
Used for: Business discovery — searches for companies by niche and location, retrieves name, address, website, and phone number.

Obtain from: [Google Cloud Console](https://console.cloud.google.com/apis/library/places-backend.googleapis.com)
- Create or select a project
- Enable the **Places API**
- Create an API key under **Credentials**
- Billing must be enabled (Places API has a free monthly credit)

---

### `COMPANIES_HOUSE_API_KEY`
Used for: UK director and officer lookup — maps company names to their registered directors via the Companies House public register.

Obtain from: [Companies House Developer Hub](https://developer.company-information.service.gov.uk/)
- Register for a free account
- Create an application to receive a key
- Free to use with rate limits

---

### `ANTHROPIC_API_KEY`
Used for: AI-powered website analysis — takes a screenshot of each company's homepage and sends it to Claude (claude-haiku-4-5-20251001) for UI and CRO analysis.

Obtain from: [Anthropic Console](https://console.anthropic.com/settings/keys)
- Sign in or create an account
- Generate an API key
- Usage is billed per token (Haiku is the most cost-effective model)

---

## Known Limitations

- **LinkedIn scraping**: LinkedIn aggressively blocks automated access and this violates their Terms of Service. Social link extraction only reads links already present in the public HTML of a business's own website.

- **Owner/director lookup**: The Companies House API only covers **UK-registered limited companies and LLPs**. Sole traders, partnerships, and foreign companies will always return "Not found". The match is fuzzy (first result by name), so mismatches are possible for companies with common names.

- **Email scraping**: Only emails exposed as `mailto:` links in public HTML are found. Obfuscated emails (e.g. JavaScript-rendered, image-based) are not extracted.

- **Website analysis**: Puppeteer requires a compatible Chromium installation. On some cloud/CI environments you may need to install Chromium dependencies separately or set the `PUPPETEER_EXECUTABLE_PATH` environment variable.

- **Rate limits**: Google Places API charges per request after the free tier. Running large searches (50 results plus detail lookups) will consume quota quickly.

---

## Legal Disclaimer

**Use responsibly and in accordance with all applicable laws.**

- This tool is designed for **local, personal research** and lead generation — not bulk commercial data harvesting.
- All scraped data is held **in-memory only** and never written to disk.
- Respect `robots.txt` directives — LeadLens checks and honours them before scraping any URL.
- Under **GDPR** (and equivalent regulations), personal data about individuals (including business contact details where the individual is identifiable) has specific handling requirements. If you are based in or targeting individuals in the UK/EU, ensure your use case has a lawful basis.
- Do not use this tool to build unsolicited marketing lists in jurisdictions where this is prohibited (e.g. GDPR, CASL, CAN-SPAM).
- The Companies House data is provided under the [Open Government Licence](https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/).
- The authors accept no liability for misuse of this tool.
