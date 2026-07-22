import https from 'https';
import fs from 'fs';

const urls = [
  '/sites/enedis_ote/files/js/js_k6_NjvoHohQ6Xt0i47dIH3ahAB6PDluQ_CcrwPxCBjY.js',
  '/sites/enedis_ote/files/js/js_3HS3Lp8cRqXTpE44tx0nW3MD3AlbqMc65bgIp5B0TSc.js',
  '/sites/enedis_ote/files/js/js_D9A6OqoUsqnVHFj0yxvSdMetSGURwlpMN1jbDV0Uf8E.js'
];

urls.forEach((url, i) => {
  https.get({hostname: 'observatoire.enedis.fr', path: url, headers: {'User-Agent': 'Mozilla/5.0'}}, res => {
    let body = '';
    res.on('data', c => body += c.toString());
    res.on('end', () => {
      const match = body.match(/https?:\/\/[a-zA-Z0-9_\-\./]+(?:json|geojson)/g) || body.match(/\/[a-zA-Z0-9_\-\./]+(?:json|geojson)/g);
      if (match) {
          console.log('Script ' + i + ':', [...new Set(match)]);
      } else {
          // search for string "api/" or "/api"
          const apiMatch = body.match(/['"]\/?[a-zA-Z0-9_\-\./]*api[a-zA-Z0-9_\-\./]*['"]/g);
          if (apiMatch) console.log('Script ' + i + ' API matches:', [...new Set(apiMatch)]);
          else console.log('Script ' + i + ': No matches');
      }
    });
  });
});
