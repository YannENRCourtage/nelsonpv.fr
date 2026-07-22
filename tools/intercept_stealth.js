import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  page.on('request', request => {
    const url = request.url();
    if (url.includes('api') || url.includes('json') || url.includes('data.enedis') || url.includes('geoserver') || url.includes('wms') || url.includes('wfs') || url.includes('dataset') || url.includes('explore')) {
      console.log('REQUEST:', url);
    }
  });

  try {
    await page.goto('https://openservices.enedis.fr/service/carte-zones-contrainte-projets-enr/', { waitUntil: 'networkidle2', timeout: 30000 });
  } catch(e) {
    console.error('Error navigating:', e.message);
  }

  await new Promise(r => setTimeout(r, 5000));
  await browser.close();
})();
