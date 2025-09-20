const puppeteer = require('puppeteer');

function cleanText(s) {
  if (!s) return '';
  return s.replace(/\s+/g, ' ').trim();
}

module.exports = async function scrapeAmazon(productUrl) {
  if (!/^https?:\/\//i.test(productUrl)) throw new Error('Invalid URL');

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setUserAgent(
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36'
  );

  await page.goto(productUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

  const data = await page.evaluate(() => {
    const text = sel => document.querySelector(sel)?.innerText || '';
    const queryAllText = sel => Array.from(document.querySelectorAll(sel)).map(n => n.innerText).join(' | ');

    const title =
      text('#productTitle') ||
      text('#title') ||
      text('.product-title-word-break') ||
      text('.ppd') ||
      text('.a-size-large.product-title-word-break') ||
      '';

    const price = text('#priceblock_ourprice') || text('#priceblock_dealprice') || text('#price_inside_buybox') || '';

    const bullets = queryAllText('#feature-bullets ul li') || queryAllText('#feature-bullets li') || '';

    let details = '';
    const tech = document.querySelectorAll('#productDetails_techSpec_section_1, #technicalSpecifications_feature_div');
    if (tech && tech.length) {
      details = Array.from(tech).map(t => t.innerText).join('\n');
    } else {
      details = queryAllText('#productDetails_detailBullets_sections1 tr') || queryAllText('#detailBullets_feature_div li') || '';
    }

    const specTable = Array.from(document.querySelectorAll('table')).map(t => t.innerText).join('\n');

    return { title, price, bullets, details: details || specTable, specTable, raw: document.documentElement.innerText.slice(0, 3000) };
  });

  const parsed = {
    title: cleanText(data.title),
    price: cleanText(data.price),
    bullets: cleanText(data.bullets),
    details: cleanText(data.details),
    raw: data.raw
  };

  await browser.close();
  return parsed;
};
