import fs from 'fs';
import * as turf from '@turf/turf';

const data = JSON.parse(fs.readFileSync('./public/datas/capareseau_map.json', 'utf8'));

const points = data.filter(d => d.X && d.Y && !isNaN(d.X) && !isNaN(d.Y)).map(d => {
  return turf.point([parseFloat(d.X), parseFloat(d.Y)], d);
});

const pointsCollection = turf.featureCollection(points);
const bbox = [-5.5, 41.3, 9.6, 51.1];

try {
  console.log('Génération des polygones Voronoi...');
  const voronoiPolygons = turf.voronoi(pointsCollection, { bbox: bbox });
  
  const finalFeatures = [];
  
  for (let i = 0; i < pointsCollection.features.length; i++) {
    const point = pointsCollection.features[i];
    const polygon = voronoiPolygons.features[i];
    
    if (polygon) {
      polygon.properties = point.properties;
      finalFeatures.push(polygon);
    }
  }

  const finalCollection = turf.featureCollection(finalFeatures);
  fs.writeFileSync('./public/datas/capareseau_voronoi.json', JSON.stringify(finalCollection));
  console.log('Fichier capareseau_voronoi.json généré avec succès ! (' + finalFeatures.length + ' polygones)');
} catch (err) {
  console.error('Erreur:', err);
}
