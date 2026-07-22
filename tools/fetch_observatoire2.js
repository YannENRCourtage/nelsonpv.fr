import https from 'https';

const options = {
  hostname: 'observatoire.enedis.fr',
  path: '/services/carte-zones-contrainte-projets-enr',
  method: 'GET',
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
  }
};

const req = https.request(options, res => {
  let body = '';
  res.on('data', chunk => body += chunk.toString());
  res.on('end', () => {
    // Look for all URLs
    const urls = body.match(/https?:\/\/[^"']+/g) || [];
    const jsonUrls = urls.filter(u => u.includes('.json') || u.includes('.geojson') || u.includes('api'));
    console.log([...new Set(jsonUrls)]);
  });
});
req.end();
