import fs from 'fs';
import * as turf from '@turf/turf';

console.log("Loading files...");
const regions = JSON.parse(fs.readFileSync('./public/datas/regions.geojson', 'utf8'));
const voronois = JSON.parse(fs.readFileSync('./public/datas/capareseau_voronoi.json', 'utf8'));

console.log("Simplifying regions...");
const simpleRegions = [];
for (const r of regions.features) {
    simpleRegions.push(turf.simplify(r, {tolerance: 0.005, highQuality: false}));
}

console.log("Unioning regions...");
let francePoly = simpleRegions[0];
for (let i = 1; i < simpleRegions.length; i++) {
    try {
        francePoly = turf.union(turf.featureCollection([francePoly, simpleRegions[i]]));
    } catch(e) {
        console.log("Skipping union error", e.message);
    }
}
// simplify union again just in case
francePoly = turf.simplify(francePoly, {tolerance: 0.01, highQuality: false});

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
            // ignore
        }
    }
    i++;
    if (i % 100 === 0) console.log("Processed " + i + " of " + voronois.features.length);
}

const out = turf.featureCollection(clippedFeatures);
fs.writeFileSync('./public/datas/capareseau_voronoi_clipped.json', JSON.stringify(out));
console.log("Done! Wrote " + clippedFeatures.length + " clipped polygons.");
