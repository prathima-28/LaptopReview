const chromium = require('chrome-aws-lambda');
const puppeteer = require('puppeteer-core');

(async () => {
  let browser = null;

  try {
    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath,
      headless: chromium.headless,
      ignoreHTTPSErrors: true,
    });

    const page = await browser.newPage();
    await page.goto('https://example.com', { waitUntil: 'networkidle2' });

    const title = await page.title();
    console.log('Page title:', title);

  } catch (err) {
    console.error('Error launching Puppeteer:', err);
  } finally {
    if (browser !== null) {
      await browser.close();
    }
  }
})();
