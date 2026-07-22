import https from 'https';

const urls = [
  'https://opendata.enedis.fr/api/v1/datasets/carte-zones-contrainte-projets-enr',
  'https://opendata.enedis.fr/api/v1/datasets/capacite-d-accueil-du-reseau-de-distribution'
];

urls.forEach(url => {
    https.get(url, res => {
      console.log(url, res.statusCode);
    });
});
