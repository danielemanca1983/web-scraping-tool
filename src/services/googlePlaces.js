const axios = require('axios');

const BASE_URL = 'https://maps.googleapis.com/maps/api/place';
const USER_AGENT = 'LeadLens/1.0 (local research tool)';
const MAX_RESULTS = 50;

function log(msg) {
  console.log(`[${new Date().toISOString()}] [GooglePlaces] ${msg}`);
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function assertValidPlacesResponse(data) {
  if (data.status && data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
    const message = data.error_message || `Google Places returned ${data.status}`;
    throw new Error(message);
  }
}

async function searchBusinesses(niche, location) {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    log('GOOGLE_PLACES_API_KEY not set — returning empty results');
    return [];
  }

  const query = `${niche} in ${location}`;
  log(`Searching: "${query}"`);

  try {
    const places = await getTextSearchResults(query, apiKey, MAX_RESULTS);
    log(`Found ${places.length} places`);

    const businesses = await Promise.all(
      places.map(async (place) => {
        const details = await getPlaceDetails(place.place_id, apiKey);
        return {
          placeId: place.place_id,
          name: place.name || '',
          address: place.formatted_address || '',
          website: details.website || null,
          phone: details.formatted_phone_number || null,
        };
      })
    );

    return businesses;
  } catch (err) {
    log(`Search error: ${err.message}`);
    throw err;
  }
}

async function getTextSearchResults(query, apiKey, limit) {
  const places = [];
  let pageToken = null;

  while (places.length < limit) {
    if (pageToken) {
      await delay(2000);
    }

    const searchRes = await axios.get(`${BASE_URL}/textsearch/json`, {
      params: pageToken ? { pagetoken: pageToken, key: apiKey } : { query, key: apiKey },
      headers: { 'User-Agent': USER_AGENT },
      timeout: 10000,
    });

    assertValidPlacesResponse(searchRes.data);
    places.push(...(searchRes.data.results || []));

    pageToken = searchRes.data.next_page_token;
    if (!pageToken || searchRes.data.status === 'ZERO_RESULTS') break;
  }

  return places.slice(0, limit);
}

async function getPlaceDetails(placeId, apiKey) {
  try {
    const res = await axios.get(`${BASE_URL}/details/json`, {
      params: {
        place_id: placeId,
        fields: 'website,formatted_phone_number',
        key: apiKey,
      },
      headers: { 'User-Agent': USER_AGENT },
      timeout: 8000,
    });
    return res.data.result || {};
  } catch (err) {
    log(`Details error for ${placeId}: ${err.message}`);
    return {};
  }
}

module.exports = { searchBusinesses };
