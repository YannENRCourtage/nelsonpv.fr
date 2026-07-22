import https from 'https';
https.get({hostname: 'observatoire.enedis.fr', path: '/sites/enedis_ote/files/js/js_k6_NjvoHohQ6Xt0i47dIH3ahAB6PDluQ_CcrwPxCBjY.js', headers: {'User-Agent': 'Mozilla/5.0'}}, res => {
  let body = '';
  res.on('data', c => body += c.toString());
  res.on('end', () => {
    // Check if there are any other API calls like fetch( or $.ajax(
    const ajaxCalls = body.match(/fetch\(.*?\)|ajax\(\{.*?\}/g);
    if(ajaxCalls) {
        console.log(ajaxCalls.slice(0, 10));
    }
    const ods = body.match(/service\/ods\/data\/[a-zA-Z0-9_\-]+/g);
    if (ods) {
        console.log("ODS API:", [...new Set(ods)]);
    }
  });
});
