import https from 'https';

const options = {
  hostname: 'opendata.enedis.fr',
  path: '/api/v1/datasets?size=1000',
  method: 'GET',
  headers: {
    'Accept': 'application/json',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
  }
};

const req = https.request(options, res => {
  let body = '';
  res.on('data', chunk => body += chunk.toString());
  res.on('end', () => {
    try {
      const data = JSON.parse(body);
      console.log('Datasets found:', data.content ? data.content.length : 'none');
      if (data.content) {
          const results = data.content.filter(d => d.title.toLowerCase().includes('contrainte') || d.id.includes('contrainte') || d.id.includes('satur'));
          results.forEach(r => console.log(r.id, '|', r.title));
      } else {
          console.log(body.substring(0, 500));
      }
    } catch(e) {
      console.log(body.substring(0, 500));
    }
  });
});
req.end();
