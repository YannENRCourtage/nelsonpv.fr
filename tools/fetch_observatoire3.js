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
    const scripts = body.match(/<script.*?>.*?<\/script>/gs);
    if (scripts) {
        scripts.forEach(s => {
            if (s.includes('contrainte') || s.includes('json') || s.includes('geojson')) {
                console.log(s.substring(0, 200));
            }
        });
    }
  });
});
req.end();
