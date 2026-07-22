import https from 'https';

const urls = [
  '/sites/enedis_ote/files/js/js_k6_NjvoHohQ6Xt0i47dIH3ahAB6PDluQ_CcrwPxCBjY.js?scope=footer&delta=1&language=fr&theme=enedis_ote&include=eJxNiVEKgDAMxS406ZFG3Z5a6JysVXCnF1HBnwQSrMhiMbPzIZ1eBzy5OmjWOrIOyexfZWpcEBtMOtp3DNzSQrx7TbVsCkdQ7ifduADiBio0',
  '/sites/enedis_ote/files/js/js_3HS3Lp8cRqXTpE44tx0nW3MD3AlbqMc65bgIp5B0TSc.js?scope=footer&delta=4&language=fr&theme=enedis_ote&include=eJxNiVEKgDAMxS406ZFG3Z5a6JysVXCnF1HBnwQSrMhiMbPzIZ1eBzy5OmjWOrIOyexfZWpcEBtMOtp3DNzSQrx7TbVsCkdQ7ifduADiBio0',
  '/sites/enedis_ote/files/js/js_D9A6OqoUsqnVHFj0yxvSdMetSGURwlpMN1jbDV0Uf8E.js?scope=footer&delta=6&language=fr&theme=enedis_ote&include=eJxNiVEKgDAMxS406ZFG3Z5a6JysVXCnF1HBnwQSrMhiMbPzIZ1eBzy5OmjWOrIOyexfZWpcEBtMOtp3DNzSQrx7TbVsCkdQ7ifduADiBio0'
];

urls.forEach((url, i) => {
  https.get({hostname: 'observatoire.enedis.fr', path: url, headers: {'User-Agent': 'Mozilla/5.0'}}, res => {
    let body = '';
    res.on('data', c => body += c.toString());
    res.on('end', () => {
      const match = body.match(/https?:\/\/[a-zA-Z0-9_\-\./]+(?:json|geojson)/g) || body.match(/\/[a-zA-Z0-9_\-\./]+(?:json|geojson)/g);
      if(match) console.log(Script :, [...new Set(match)]);
    });
  });
});
