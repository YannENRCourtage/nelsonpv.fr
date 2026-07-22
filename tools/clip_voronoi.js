import fs from 'fs';
import * as turf from '@turf/turf';

console.log("Loading files...");
const regions = JSON.parse(fs.readFileSync('./public/datas/regions.geojson', 'utf8'));
const voronois = JSON.parse(fs.readFileSync('./public/datas/capareseau_voronoi.json', 'utf8'));

console.log("Unioning regions...");
let francePoly = regions.features[0];
for (let i = 1; i < regions.features.length; i++) {
    try {
        francePoly = turf.union(turf.featureCollection([francePoly, regions.features[i]]));
    } catch(e) {
        console.log("Skipping a region union due to error", e.message);
    }
}

console.log("Clipping Voronoi polygons...");
const clippedFeatures = [];
let i = 0;
for (const feature of voronois.features) {
    if (feature.geometry) {
        try {
            const clipped = turf.intersect(turf.featureCollection([feature, francePoly]));
            if (clipped) {
                clipped.properties = feature.properties;
                clippedFeatures.push(clipped);
            }
        } catch (e) {
            // ignore clipping errors
        }
    }
    i++;
}

const out = turf.featureCollection(clippedFeatures);
fs.writeFileSync('./public/datas/capareseau_voronoi_clipped.json', JSON.stringify(out));
console.log("Done! Wrote " + clippedFeatures.length + " clipped polygons.");
