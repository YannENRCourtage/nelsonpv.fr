import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  page.on('request', request => {
    const url = request.url();
    if (url.includes('api') || url.includes('json') || url.includes('geojson') || url.includes('wms') || url.includes('wfs')) {
      console.log('API CALL:', url);
    }
  });

  try {
    await page.goto('https://observatoire.enedis.fr/services/carte-zones-contrainte-projets-enr', { waitUntil: 'networkidle0', timeout: 30000 });
    
    // Attendre un peu puis zoomer ou cliquer au centre
    await page.waitForTimeout(5000);
    const boundingBox = await page.evaluate(() => {
        const map = document.querySelector('.leaflet-container');
        if (map) {
            const rect = map.getBoundingClientRect();
            return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
        }
        return null;
    });
    
    if (boundingBox) {
        await page.mouse.click(boundingBox.x, boundingBox.y);
        await page.waitForTimeout(3000);
        // Scroll / Zoom
        await page.mouse.wheel({ deltaY: -500 });
        await page.waitForTimeout(5000);
    }

  } catch(e) {
    console.error('Error navigating:', e.message);
  }

  await browser.close();
})();
