import https from 'https';
const url1 = 'https://opendata.enedis.fr/api/explore/v2.1/catalog/datasets/carte-zones-contrainte-projets-enr/records?limit=1';
const url2 = 'https://opendata.enedis.fr/datasets/explore/v2.1/catalog/datasets/carte-zones-contrainte-projets-enr/records?limit=1';
https.get(url1, (res) => console.log('URL1:', res.statusCode));
https.get(url2, (res) => console.log('URL2:', res.statusCode));
