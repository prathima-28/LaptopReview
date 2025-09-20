const express = require('express');
const router = express.Router();
const scrapeAmazon = require('../services/scrapeAmazon');
const { analyzeSpecs } = require('../services/analyzeLogic');

router.post('/', async (req, res) => {
  const { budget, purpose, url } = req.body || {};
  if (!url) return res.status(400).json({ error: 'url required' });

  try {
    const specs = await scrapeAmazon(url);

    if (!specs || !specs.title) {
      return res.status(500).json({ error: 'Failed to scrape product' });
    }

    const isLaptop = /laptop|notebook|macbook|chromebook|zenbook|spectre|thinkpad/i.test(
      (specs.title || '') + ' ' + (specs.details || '')
    );

    if (!isLaptop) {
      return res.json({
        isLaptop: false,
        specs,
        message: `🚨 Oops! That doesn't look like a laptop — it seems to be: "${specs.title}".\nAre you trying to review a ${specs.title} as a laptop? 😄 Please paste a laptop product link.`
      });
    }

    const analysis = analyzeSpecs(specs, budget, purpose);
    res.json({ isLaptop: true, specs, analysis });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error', detail: err.message });
  }
});

module.exports = router;
