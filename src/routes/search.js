const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { searchBusinesses } = require('../services/googlePlaces');
const { searchCompany } = require('../services/companiesHouse');
const { scrapeWebsite } = require('../services/contactScraper');

function log(msg) {
  console.log(`[${new Date().toISOString()}] [Search] ${msg}`);
}

function generateId() {
  return crypto.randomUUID();
}

router.post('/', async (req, res) => {
  const { niche, location } = req.body;

  if (!niche || !location) {
    return res.status(400).json({ error: 'niche and location are required' });
  }

  log(`Search request: niche="${niche}", location="${location}"`);

  try {
    const places = await searchBusinesses(niche, location);

    if (!places.length) {
      return res.json({ results: [], message: 'No businesses found for this search.' });
    }

    log(`Processing ${places.length} businesses`);

    const results = await Promise.all(
      places.map(async (place) => {
        const id = generateId();

        // Companies House lookup (UK only)
        const ownerName = await searchCompany(place.name);

        // Contact scraping
        let email = null;
        let socialLinks = { linkedin: null, facebook: null, instagram: null, twitter: null, tiktok: null };

        if (place.website) {
          try {
            const scraped = await scrapeWebsite(place.website);
            email = scraped.email;
            socialLinks = scraped.socialLinks;
          } catch (err) {
            log(`Scrape failed for ${place.website}: ${err.message}`);
          }
        }

        return {
          id,
          name: place.name,
          address: place.address,
          website: place.website || null,
          phone: place.phone || null,
          ownerName,
          email,
          socialLinks,
          uiAnalysis: null,
        };
      })
    );

    log(`Search complete — returning ${results.length} results`);
    res.json({ results });
  } catch (err) {
    log(`Search error: ${err.message}`);
    res.status(500).json({ error: err.message || 'Search failed. Please try again.' });
  }
});

module.exports = router;
