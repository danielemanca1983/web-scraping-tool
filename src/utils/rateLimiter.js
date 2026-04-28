const pLimit = require('p-limit');

// Max 3 concurrent scrape requests
const limit = pLimit(3);

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

let lastRequestTime = 0;

async function throttledRequest(fn) {
  return limit(async () => {
    const now = Date.now();
    const elapsed = now - lastRequestTime;
    if (elapsed < 500) {
      await delay(500 - elapsed);
    }
    lastRequestTime = Date.now();
    return fn();
  });
}

module.exports = { throttledRequest, delay };
