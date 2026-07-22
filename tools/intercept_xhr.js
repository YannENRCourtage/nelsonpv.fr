import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  page.on('request', request => {
    if (request.resourceType() === 'xhr' || request.resourceType() === 'fetch') {
      console.log('API CALL:', request.url());
    }
  });

  try {
    await page.goto('https://openservices.enedis.fr/service/carte-zones-contrainte-projets-enr/', { waitUntil: 'networkidle0', timeout: 45000 });
  } catch(e) {
    console.error('Error navigating:', e.message);
  }

  await new Promise(r => setTimeout(r, 10000));
  await browser.close();
})();
