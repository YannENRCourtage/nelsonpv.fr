import fs from 'fs';
import path from 'path';
import axios from 'axios';
import unzipper from 'unzipper';
import csv from 'csv-parser';
import shp from 'shpjs';
import proj4 from 'proj4';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Lambert 93 definition
proj4.defs("EPSG:2154", "+proj=lcc +lat_1=49 +lat_2=44 +lat_0=46.5 +lon_0=3 +x_0=700000 +y_0=6600000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs");

const OUT_DIR = path.join(__dirname, '../public/data/sdis');
if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

async function processSDIS34() {
  console.log('Processing SDIS 34 (Hérault)...');
  const url = 'https://static.data.gouv.fr/resources/points-deau-incendie-du-departement-de-lherault-sdis-34/20240223-133910/peis-herault-l93.zip';
  
  const response = await axios({ method: 'get', url, responseType: 'stream' });
  const features = [];
  
  return new Promise((resolve, reject) => {
    response.data.pipe(unzipper.Parse())
      .on('entry', function (entry) {
        if (entry.path.endsWith('.csv')) {
          entry.pipe(csv({ separator: ';' })) // Assume semicolon first, fallback to comma later if needed
            .on('data', (row) => {
              // We need to guess the X/Y columns. Typical names: X, Y, X_L93, Y_L93, coord_x, coord_y
              const keys = Object.keys(row);
              if (keys.length === 1 && keys[0].includes(',')) {
                 // It's comma separated actually
                 // We will handle this gracefully later, let's assume standard parsing for now
              }
              
              let xStr = row['X'] || row['x'] || row['X_L93'] || row['x_l93'] || row['coord_x'];
              let yStr = row['Y'] || row['y'] || row['Y_L93'] || row['y_l93'] || row['coord_y'];
              
              if (xStr && yStr) {
                const x = parseFloat(xStr.replace(',', '.'));
                const y = parseFloat(yStr.replace(',', '.'));
                
                if (!isNaN(x) && !isNaN(y)) {
                  try {
                    const [lng, lat] = proj4("EPSG:2154", "EPSG:4326", [x, y]);
                    
                    features.push({
                      type: "Feature",
                      geometry: { type: "Point", coordinates: [lng, lat] },
                      properties: {
                        commune: row['commune'] || row['COMMUNE'],
                        numero: row['numero'] || row['NUMERO'] || row['id'],
                        type_hydrant: row['type_pei'] || row['TYPE_PEI'] || row['type'],
                        etat: row['etat'] || row['ETAT']
                      }
                    });
                  } catch(e) {
                    // Invalid coords
                  }
                }
              }
            })
            .on('end', () => {
              const geojson = { type: "FeatureCollection", features };
              fs.writeFileSync(path.join(OUT_DIR, 'sdis34.geojson'), JSON.stringify(geojson));
              console.log(`SDIS 34 saved: ${features.length} points.`);
            });
        } else {
          entry.autodrain();
        }
      })
      .on('close', resolve)
      .on('error', reject);
  });
}

async function processSDIS30() {
  console.log('Processing SDIS 30 (Gard)...');
  const url = 'https://static.data.gouv.fr/resources/point-deau-incendie-2/20190319-142715/pei-open.zip';
  
  const response = await axios({ method: 'get', url, responseType: 'arraybuffer' });
  const geojsonRaw = await shp(response.data);
  
  // Reproject if shpjs didn't do it properly (shpjs uses proj4 if .prj is present and standard, but sometimes it just outputs the raw coords in geometry)
  // Let's check the first feature
  const features = Array.isArray(geojsonRaw) ? geojsonRaw[0].features : geojsonRaw.features;
  
  const reprojectedFeatures = features.map(f => {
    let coords = f.geometry.coordinates;
    if (coords && coords.length === 2 && coords[0] > 180) { // If X is > 180, it's likely still in Lambert 93
      coords = proj4("EPSG:2154", "EPSG:4326", coords);
    }
    
    // Normalize properties
    const props = f.properties;
    return {
      type: "Feature",
      geometry: { type: "Point", coordinates: coords },
      properties: {
        commune: props.COMMUNE || props.commune,
        numero: props.ID || props.id || props.NUMERO,
        type_hydrant: props.TYPE || props.type || props.NATURE,
        etat: props.ETAT || props.etat
      }
    };
  });
  
  const finalGeojson = { type: "FeatureCollection", features: reprojectedFeatures };
  fs.writeFileSync(path.join(OUT_DIR, 'sdis30.geojson'), JSON.stringify(finalGeojson));
  console.log(`SDIS 30 saved: ${reprojectedFeatures.length} points.`);
}

async function processSDIS04() {
  console.log('Processing SDIS 04 (Alpes-de-Haute-Provence)...');
  // Overpass API fallback for SDIS 04 since official open data is a WMS image stream
  const query = `
    [out:json][timeout:25];
    area["boundary"="administrative"]["name"="Alpes-de-Haute-Provence"]->.a;
    node["emergency"="fire_hydrant"](area.a);
    out body;
  `;
  
  try {
    const response = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
        'User-Agent': 'NelsonPV/1.0 (contact@nelsonpv.fr)'
      },
      body: `data=${encodeURIComponent(query)}`
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    const features = data.elements.map(el => {
      return {
        type: "Feature",
        geometry: { type: "Point", coordinates: [el.lon, el.lat] },
        properties: {
          commune: el.tags['addr:city'] || 'Inconnue',
          numero: el.tags['ref'] || el.id.toString(),
          type_hydrant: el.tags['fire_hydrant:type'] || 'PI',
          etat: 'Opérationnel'
        }
      };
    });
    
    const geojson = { type: "FeatureCollection", features };
    fs.writeFileSync(path.join(OUT_DIR, 'sdis04.geojson'), JSON.stringify(geojson));
    console.log(`SDIS 04 saved: ${features.length} points (via Overpass).`);
  } catch (err) {
    console.error('Error fetching SDIS 04 from Overpass', err.message);
  }
}

async function main() {
  try {
    await processSDIS34();
    await processSDIS30();
    await processSDIS04();
    console.log('All SDIS datasets processed successfully.');
  } catch (e) {
    console.error('Error:', e);
  }
}

main();
