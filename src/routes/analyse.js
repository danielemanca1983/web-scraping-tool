const express = require('express');
const router = express.Router();
const { analyseWebsite } = require('../services/uiAnalyser');

function log(msg) {
  console.log(`[${new Date().toISOString()}] [Analyse] ${msg}`);
}

router.post('/', async (req, res) => {
  const { websiteUrl, companyId } = req.body;

  if (!websiteUrl) {
    return res.status(400).json({ error: 'websiteUrl is required' });
  }

  log(`Analyse request: url="${websiteUrl}", companyId="${companyId}"`);

  const result = await analyseWebsite(websiteUrl);
  res.json({ companyId, ...result });
});

module.exports = router;
