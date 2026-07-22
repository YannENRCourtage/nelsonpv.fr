import https from 'https';

const url = 'https://data.enedis.fr/api/explore/v2.1/catalog/datasets/carte-zones-contrainte-projets-enr/records?limit=1';

https.get(url, (res) => {
  console.log('Status Code:', res.statusCode);
  console.log('Headers:', res.headers);
}).on('error', (e) => {
  console.error(e);
});
