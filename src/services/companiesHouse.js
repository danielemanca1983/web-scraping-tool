const axios = require('axios');
const { delay } = require('../utils/rateLimiter');

const BASE_URL = 'https://api.company-information.service.gov.uk';

function log(msg) {
  console.log(`[${new Date().toISOString()}] [CompaniesHouse] ${msg}`);
}

function makeAuthHeader() {
  const apiKey = process.env.COMPANIES_HOUSE_API_KEY;
  if (!apiKey) return null;
  // Companies House uses HTTP Basic Auth with API key as username, empty password
  const encoded = Buffer.from(`${apiKey}:`).toString('base64');
  return { Authorization: `Basic ${encoded}` };
}

async function searchCompany(companyName) {
  const headers = makeAuthHeader();
  if (!headers) {
    log('COMPANIES_HOUSE_API_KEY not set — skipping');
    return 'Not found';
  }

  log(`Searching for: "${companyName}"`);

  try {
    const res = await axios.get(`${BASE_URL}/search/companies`, {
      params: { q: companyName, items_per_page: 3 },
      headers,
      timeout: 8000,
    });

    const items = res.data.items || [];
    if (!items.length) {
      log(`No match for "${companyName}"`);
      return 'Not found';
    }

    const company = items[0];
    const companyNumber = company.company_number;
    log(`Found company number ${companyNumber} for "${companyName}"`);

    return await getDirector(companyNumber, headers);
  } catch (err) {
    if (err.response?.status === 429) {
      log('Rate limited — retrying in 2s');
      await delay(2000);
      return searchCompany(companyName);
    }
    log(`Search error for "${companyName}": ${err.message}`);
    return 'Not found';
  }
}

async function getDirector(companyNumber, headers) {
  try {
    const res = await axios.get(`${BASE_URL}/company/${companyNumber}/officers`, {
      params: { items_per_page: 10 },
      headers,
      timeout: 8000,
    });

    const officers = (res.data.items || []).filter(
      (o) => !o.resigned_on && o.officer_role === 'director'
    );

    if (!officers.length) {
      log(`No active directors found for company ${companyNumber}`);
      return 'Not found';
    }

    const director = officers[0];
    const name = director.name || '';
    // Companies House returns "SURNAME, Firstname" — normalise to "Firstname Surname"
    const parts = name.split(',').map((p) => p.trim());
    const normalised = parts.length === 2 ? `${parts[1]} ${parts[0]}` : name;

    log(`Director for ${companyNumber}: ${normalised}`);
    return normalised;
  } catch (err) {
    log(`Officers error for ${companyNumber}: ${err.message}`);
    return 'Not found';
  }
}

module.exports = { searchCompany };
