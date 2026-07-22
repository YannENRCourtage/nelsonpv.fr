import https from 'https';
const req = https.request({hostname: 'observatoire.enedis.fr', path: '/services/carte-zones-contrainte-projets-enr', method: 'GET', headers: {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}}, res => {
  let body = '';
  res.on('data', chunk => body += chunk.toString());
  res.on('end', () => {
    const scripts = body.match(/<script src="([^"]+)"><\/script>/g);
    if(scripts) {
        scripts.forEach(s => console.log(s));
    }
  });
});
req.end();
