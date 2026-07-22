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
    console.log(res.statusCode);
    if(res.statusCode === 403) console.log("Cloudflare blocked");
    else console.log(body.substring(0, 500));
  });
});
req.end();
