require('dotenv').config();
const express = require('express');
const path = require('path');
const { Parser } = require('json2csv');

const searchRouter = require('./src/routes/search');
const analyseRouter = require('./src/routes/analyse');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// API routes
app.use('/api/search', searchRouter);
app.use('/api/analyse', analyseRouter);

// CSV export — accepts the results array in the request body
app.post('/api/export', (req, res) => {
  const { results } = req.body;

  if (!Array.isArray(results) || !results.length) {
    return res.status(400).json({ error: 'results array is required' });
  }

  try {
    const rows = results.map((r) => ({
      Name: r.name || '',
      Address: r.address || '',
      Website: r.website || '',
      Phone: r.phone || '',
      Owner: r.ownerName || '',
      Email: r.email || '',
      LinkedIn: r.socialLinks?.linkedin || '',
      Facebook: r.socialLinks?.facebook || '',
      Instagram: r.socialLinks?.instagram || '',
      Twitter: r.socialLinks?.twitter || '',
      TikTok: r.socialLinks?.tiktok || '',
      UIScore: r.uiAnalysis?.overallScore ?? '',
      UISummary: r.uiAnalysis?.summary || '',
    }));

    const parser = new Parser();
    const csv = parser.parse(rows);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="leadlens-export.csv"');
    res.send(csv);
  } catch (err) {
    console.error(`[${new Date().toISOString()}] [Export] Error: ${err.message}`);
    res.status(500).json({ error: 'Export failed' });
  }
});

// Serve frontend for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`[${new Date().toISOString()}] LeadLens running on http://localhost:${PORT}`);
});
