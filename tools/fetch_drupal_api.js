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
    const match = body.match(/<script type="application\/json" data-drupal-selector="drupal-settings-json">(.*?)<\/script>/s);
    if (match) {
        try {
            const data = JSON.parse(match[1]);
            if (data.datavizSourceApiRoutes) {
                 console.log(JSON.stringify(data.datavizSourceApiRoutes, null, 2));
            }
        } catch(e) {}
    }
  });
});
req.end();
