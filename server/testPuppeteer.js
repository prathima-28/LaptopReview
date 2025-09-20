// testPuppeteer.js
const puppeteer = require('puppeteer-core'); // Use puppeteer-core for server environments
const chromium = require('chrome-aws-lambda'); // Compatible Chromium for cloud/server

(async () => {
  try {
    // Launch browser with correct executable path and arguments
    const browser = await puppeteer.launch({
      executablePath: await chromium.executablePath,
      headless: 'new',      // Use the new headless mode
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
    });

    const page = await browser.newPage();
    await page.goto('https://www.google.com', { waitUntil: 'networkidle2' });

    const title = await page.title();
    console.log('Page title:', title); // Should print: "Google"

    await browser.close();
  } catch (err) {
    console.error('Error launching Puppeteer:', err);
  }
})();
