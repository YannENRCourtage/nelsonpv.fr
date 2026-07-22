import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  page.on('request', request => {
    const url = request.url();
    if (url.includes('api') || url.includes('json') || url.includes('data.enedis') || url.includes('geoserver') || url.includes('wms') || url.includes('wfs')) {
      console.log('REQUEST:', url);
    }
  });

  page.on('response', async response => {
    const url = response.url();
    if (url.includes('api') || url.includes('json') || url.includes('data.enedis') || url.includes('geoserver')) {
        console.log('RESPONSE:', url, 'STATUS:', response.status());
    }
  });

  try {
    await page.goto('https://openservices.enedis.fr/service/carte-zones-contrainte-projets-enr/', { waitUntil: 'networkidle2', timeout: 30000 });
  } catch(e) {
    console.error('Error navigating:', e);
  }

  await new Promise(r => setTimeout(r, 5000));
  await browser.close();
})();
