import https from 'https';
https.get('https://data.enedis.fr/explore/', res => {
  let body = '';
  res.on('data', c => body += c.toString());
  res.on('end', () => {
    const datasets = body.match(/\/explore\/dataset\/([a-zA-Z0-9_\-]+)\//g);
    if(datasets) {
        console.log([...new Set(datasets)]);
    } else {
        console.log("No datasets found on explore page");
    }
  });
});
