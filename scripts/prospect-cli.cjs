#!/usr/bin/env node
/**
 * ═══════════════════════════════════════════════════════════════════════════
 * NELSON PROSPECT CLI
 * Outil de prospection automatisée en ligne de commande pour toitures solaires
 * Emprise au sol : 500 m² à 2 500 m² / Puissance : 100 kWc à 500 kWc
 * Enregistrement : C:\Users\Utilisateur\PDF TOITURES
 * ═══════════════════════════════════════════════════════════════════════════
 * Usage :
 *   node scripts/prospect-cli.cjs --commune="Seclin" --limit=5
 *   node scripts/prospect-cli.cjs --bbox="50.54,3.02,50.56,3.05" --limit=10
 */

const fs = require('fs');
const path = require('path');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');

// Arguments en ligne de commande
const args = process.argv.slice(2).reduce((acc, arg) => {
  const [key, value] = arg.replace(/^--/, '').split('=');
  acc[key] = value !== undefined ? value : true;
  return acc;
}, {});

const COMMUNE = args.commune || 'Seclin';
const MIN_AREA = parseInt(args.minArea || '500', 10);
const MAX_AREA = parseInt(args.maxArea || '2500', 10);
const LIMIT = parseInt(args.limit || '10', 10);
const PITCH = parseInt(args.pitch || '15', 10);
const OUTPUT_DIR = args.outputDir || path.join(process.env.USERPROFILE || 'C:\\Users\\Utilisateur', 'PDF TOITURES');

function calculatePolygonArea(latlngs) {
  if (!latlngs || latlngs.length < 3) return 0;
  const EARTH_RADIUS = 6378137;
  let total = 0;
  const numPoints = latlngs.length;

  for (let i = 0; i < numPoints; i++) {
    const p1 = latlngs[i];
    const p2 = latlngs[(i + 1) % numPoints];
    const lat1 = (p1.lat * Math.PI) / 180;
    const lat2 = (p2.lat * Math.PI) / 180;
    const lng1 = (p1.lng * Math.PI) / 180;
    const lng2 = (p2.lng * Math.PI) / 180;
    total += (lng2 - lng1) * (2 + Math.sin(lat1) + Math.sin(lat2));
  }
  return Math.round(Math.abs((total * EARTH_RADIUS * EARTH_RADIUS) / 2.0));
}

function calculateCentroid(points) {
  const sumLat = points.reduce((acc, p) => acc + p.lat, 0);
  const sumLng = points.reduce((acc, p) => acc + p.lng, 0);
  return [sumLat / points.length, sumLng / points.length];
}

async function run() {
  console.log('\n╔═══════════════════════════════════════════════════════════════════════╗');
  console.log('║               NELSON PV — PROSPECTION TOITURE MASSIVE                 ║');
  console.log('╚═══════════════════════════════════════════════════════════════════════╝\n');

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    console.log(`📁 Dossier créé : ${OUTPUT_DIR}`);
  }

  // 1. Résolution de la commune
  console.log(`📍 Recherche de la commune : "${COMMUNE}"...`);
  const geoUrl = `https://geo.api.gouv.fr/communes?nom=${encodeURIComponent(COMMUNE)}&fields=nom,code,codesPostaux,centre,contour,bbox&boost=population&limit=1`;
  const geoRes = await fetch(geoUrl);
  const geoData = await geoRes.json();

  if (!geoData || geoData.length === 0) {
    console.error(`❌ Commune "${COMMUNE}" introuvable.`);
    process.exit(1);
  }

  const communeObj = geoData[0];
  console.log(`✅ Commune trouvée : ${communeObj.nom} (${communeObj.code})`);

  let bbox = null;
  if (args.bbox) {
    const [minLat, minLng, maxLat, maxLng] = args.bbox.split(',').map(Number);
    bbox = { minLat, minLng, maxLat, maxLng };
  } else if (communeObj.bbox && communeObj.bbox.coordinates && communeObj.bbox.coordinates[0]) {
    const ring = communeObj.bbox.coordinates[0];
    const lngs = ring.map(pt => pt[0]);
    const lats = ring.map(pt => pt[1]);
    bbox = {
      minLat: Math.min(...lats),
      minLng: Math.min(...lngs),
      maxLat: Math.max(...lats),
      maxLng: Math.max(...lngs)
    };
  }

  if (!bbox) {
    console.error('❌ Bbox indisponible.');
    process.exit(1);
  }

  console.log(`🌐 Emprise géographique : [${bbox.minLat.toFixed(4)}, ${bbox.minLng.toFixed(4)}] à [${bbox.maxLat.toFixed(4)}, ${bbox.maxLng.toFixed(4)}]`);
  console.log(`🎯 Filtre de surface : ${MIN_AREA} m² à ${MAX_AREA} m² (cible 100 à 500 kWc)\n`);

  // 2. Requête Overpass
  console.log('🛰️  Extraction des empreintes de bâtiments via Overpass API...');
  const overpassQuery = `[out:json][timeout:35];(way["building"](${bbox.minLat},${bbox.minLng},${bbox.maxLat},${bbox.maxLng}););out geom;`;

  const mirrors = [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
    'https://overpass.osm.ch/api/interpreter'
  ];

  let rawData = null;
  for (const mirror of mirrors) {
    try {
      console.log(`   Tentative miroir : ${mirror}...`);
      const res = await fetch(mirror, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'NelsonPV-CLI/1.0 (contact@nelsonpv.fr)'
        },
        body: 'data=' + encodeURIComponent(overpassQuery)
      });
      if (res.ok) {
        rawData = await res.json();
        console.log(`   ✅ Réponse OK de ${mirror} (${rawData.elements?.length || 0} éléments)`);
        if (rawData.elements && rawData.elements.length > 0) {
          break;
        }
      } else {
        console.log(`   ⚠️ Réponse ${res.status} de ${mirror}`);
      }
    } catch (e) {
      console.log(`   ⚠️ Erreur ${mirror}:`, e.message);
    }
  }

  if (!rawData || !rawData.elements) {
    console.error('❌ Échec de la récupération des données cartographiques.');
    process.exit(1);
  }

  console.log(`📊 ${rawData.elements.length} empreintes brutes analysées.`);

  const eligible = [];
  for (const el of rawData.elements) {
    if (!el.geometry || el.geometry.length < 3) continue;
    const pts = el.geometry.map(g => ({ lat: g.lat, lng: g.lon }));
    const area = calculatePolygonArea(pts);

    if (area > MIN_AREA && area < MAX_AREA) {
      eligible.push({
        id: el.id,
        area,
        polygon: pts,
        center: calculateCentroid(pts),
        type: el.tags?.building || 'commercial'
      });
      if (eligible.length >= LIMIT) break;
    }
  }

  console.log(`✨ ${eligible.length} bâtiments éligibles identifiés (puissance cible 100 - 500 kWc).\n`);

  // 3. Boucle de génération
  let successCount = 0;
  for (let i = 0; i < eligible.length; i++) {
    const b = eligible[i];
    console.log(`─── Bâtiment ${i + 1}/${eligible.length} [OSM #${b.id}] (${b.area} m²) ───`);

    // Adresse BAN
    let address = `${communeObj.nom} (${communeObj.code.substring(0, 2)})`;
    try {
      const banRes = await fetch(`https://api-adresse.data.gouv.fr/reverse/?lon=${b.center[1]}&lat=${b.center[0]}`);
      if (banRes.ok) {
        const banJson = await banRes.json();
        const feat = banJson.features?.[0]?.properties;
        if (feat && feat.label) address = feat.label;
      }
    } catch (e) {}

    // Cadastre
    let cadastreRef = 'Cadastre en cours';
    try {
      const geomParam = encodeURIComponent(JSON.stringify({ type: 'Point', coordinates: [b.center[1], b.center[0]] }));
      const cadRes = await fetch(`https://apicarto.ign.fr/api/cadastre/parcelle?geom=${geomParam}`);
      if (cadRes.ok) {
        const cadJson = await cadRes.json();
        const p = cadJson.features?.[0]?.properties;
        if (p && p.section) cadastreRef = `Section ${p.section} N° ${p.numero}`;
      }
    } catch (e) {}

    // Calcul Solaire
    const rawPanels = Math.round((b.area * 0.90) / 2.05);
    const rawKwc = Math.round(rawPanels * 0.465 * 10) / 10;
    const installedKwc = Math.max(100, Math.min(500, rawKwc));
    const panelCount = Math.round((installedKwc * 1000) / 465);

    const baseYield = 1080; // kWh/kWc/an
    const annualProdKwh = Math.round(installedKwc * baseYield * 0.96 * 0.90);
    const tarifEdfOa = 0.085; // €/kWh
    const annualRevenue = Math.round(annualProdKwh * tarifEdfOa);
    const formatNum = (num) => (num !== undefined && num !== null ? num.toLocaleString('fr-FR').replace(/[\u202F\u00A0]/g, ' ') : '0');

    const ca30Ans = annualRevenue * 30;
    const capex = Math.round(installedKwc * 920);

    console.log(`   📍 Adresse : ${address}`);
    console.log(`   📐 Parcelle : ${cadastreRef}`);
    console.log(`   ⚡ Puissance : ${installedKwc} kWc (${panelCount} modules 465 Wc)`);
    console.log(`   💶 Chiffre d'Affaires EDF OA : ${formatNum(annualRevenue)} €/an (30 ans : ${formatNum(ca30Ans)} €)`);

    // Génération PDF via pdf-lib
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595.28, 841.89]); // A4
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

    // En-tête bleu NELSON
    page.drawRectangle({
      x: 0,
      y: 741.89,
      width: 595.28,
      height: 100,
      color: rgb(0.055, 0.169, 0.302) // #0e2b4d
    });

    page.drawText('NELSON — PROSPECTION SOLAIRE TOITURE', {
      x: 30,
      y: 800,
      size: 18,
      font: fontBold,
      color: rgb(1, 1, 1)
    });

    page.drawText(`ÉTUDE D'OPPORTUNITÉ PHOTOVOLTAÏQUE : ${installedKwc} kWc`, {
      x: 30,
      y: 775,
      size: 12,
      font: fontBold,
      color: rgb(0.949, 0.580, 0) // Amber
    });

    page.drawText(`Édité le ${new Date().toLocaleDateString('fr-FR')} pour ${address}`, {
      x: 30,
      y: 755,
      size: 9,
      font: fontRegular,
      color: rgb(0.8, 0.85, 0.9)
    });

    // Bloc Caractéristiques Techniques
    let y = 700;
    page.drawText('1. DONNÉES DU BÂTIMENT & CADASTRE', { x: 30, y, size: 13, font: fontBold, color: rgb(0.055, 0.169, 0.302) });
    y -= 22;
    page.drawText(`• Adresse du site : ${address}`, { x: 40, y, size: 10, font: fontRegular, color: rgb(0.2, 0.2, 0.2) });
    y -= 16;
    page.drawText(`• Commune & Département : ${communeObj.nom} (${communeObj.code.substring(0, 2)})`, { x: 40, y, size: 10, font: fontRegular, color: rgb(0.2, 0.2, 0.2) });
    y -= 16;
    page.drawText(`• Référence cadastrale : ${cadastreRef}`, { x: 40, y, size: 10, font: fontRegular, color: rgb(0.2, 0.2, 0.2) });
    y -= 16;
    page.drawText(`• Emprise au sol : ${b.area} m²`, { x: 40, y, size: 10, font: fontRegular, color: rgb(0.2, 0.2, 0.2) });
    y -= 16;
    page.drawText(`• Configuration toiture : Symétrique bipente 15° (orientation optimisée)`, { x: 40, y, size: 10, font: fontRegular, color: rgb(0.2, 0.2, 0.2) });

    // Bloc Dimensionnement
    y -= 30;
    page.drawText('2. DIMENSIONNEMENT PHOTOVOLTAÏQUE & PRODUCTION', { x: 30, y, size: 13, font: fontBold, color: rgb(0.055, 0.169, 0.302) });
    y -= 22;
    page.drawText(`• Puissance installée cible : ${installedKwc} kWc`, { x: 40, y, size: 10, font: fontBold, color: rgb(0.055, 0.169, 0.302) });
    y -= 16;
    page.drawText(`• Nombre de modules photovoltaïques : ${panelCount} modules haute performance 465 Wc portrait`, { x: 40, y, size: 10, font: fontRegular, color: rgb(0.2, 0.2, 0.2) });
    y -= 16;
    page.drawText(`• Production annuelle estimée : ~${formatNum(annualProdKwh)} kWh/an`, { x: 40, y, size: 10, font: fontRegular, color: rgb(0.2, 0.2, 0.2) });
    y -= 16;
    page.drawText(`• Émissions CO2 évitées : ${formatNum(Math.round(annualProdKwh * 0.0005 * 10) / 10)} tonnes/an (~${formatNum(Math.round(annualProdKwh * 0.00143))} arbres plantés/an)`, { x: 40, y, size: 10, font: fontRegular, color: rgb(0.2, 0.2, 0.2) });

    // Bloc Économique
    y -= 30;
    page.drawText('3. MODÈLE ÉCONOMIQUE & RENTABILITÉ FINANCIÈRE (EDF OA 30 ANS)', { x: 30, y, size: 13, font: fontBold, color: rgb(0.055, 0.169, 0.302) });
    y -= 22;
    page.drawText(`• Tarif réglementé garanti EDF OA : 0,085 €/kWh`, { x: 40, y, size: 10, font: fontRegular, color: rgb(0.2, 0.2, 0.2) });
    y -= 16;
    page.drawText(`• Revenu annuel garanti : ${formatNum(annualRevenue)} €/an`, { x: 40, y, size: 11, font: fontBold, color: rgb(0.04, 0.5, 0.3) });
    y -= 16;
    page.drawText(`• Chiffre d'Affaires cumulé sur 30 ans : ${formatNum(ca30Ans)} €`, { x: 40, y, size: 11, font: fontBold, color: rgb(0.04, 0.5, 0.3) });
    y -= 16;
    page.drawText(`• Investissement clé en main estimé (CAPEX) : ${formatNum(capex)} € HT (920 €/kWc)`, { x: 40, y, size: 10, font: fontRegular, color: rgb(0.2, 0.2, 0.2) });
    y -= 16;
    page.drawText(`• Temps de retour sur investissement (Payback) : ${(capex / annualRevenue).toFixed(1)} ans`, { x: 40, y, size: 10, font: fontBold, color: rgb(0.055, 0.169, 0.302) });

    // Coordonnées GPS
    y -= 30;
    page.drawText(`Coordonnées géographiques : [${b.center[0].toFixed(6)}, ${b.center[1].toFixed(6)}] • OSM ID : #${b.id}`, {
      x: 30,
      y,
      size: 8,
      font: fontRegular,
      color: rgb(0.5, 0.5, 0.5)
    });

    // Pied de page
    page.drawRectangle({
      x: 0,
      y: 0,
      width: 595.28,
      height: 35,
      color: rgb(0.95, 0.96, 0.98)
    });
    page.drawText('NELSON — Plateforme de simulation & courtage solaire (nelsonpv.fr) • contact@enr-courtage.fr', {
      x: 40,
      y: 14,
      size: 8,
      font: fontRegular,
      color: rgb(0.4, 0.45, 0.5)
    });

    const pdfBytes = await pdfDoc.save();
    const cleanCity = communeObj.nom.replace(/[^a-zA-Z0-9]/g, '_');
    const filename = `Offre_Toiture_${cleanCity}_${installedKwc}kWc_${b.area}m2_OSM${b.id}.pdf`;
    const filePath = path.join(OUTPUT_DIR, filename);

    fs.writeFileSync(filePath, pdfBytes);
    console.log(`   💾 Fichier enregistré : ${filename} (${(pdfBytes.length / 1024).toFixed(1)} Ko)\n`);
    successCount++;
  }

  console.log('═══════════════════════════════════════════════════════════════════════');
  console.log(`🎉 PROSPECTION TERMINÉE : ${successCount}/${eligible.length} offres commerciales PDF générées !`);
  console.log(`📂 Répertoire de destination : ${OUTPUT_DIR}`);
  console.log('═══════════════════════════════════════════════════════════════════════\n');
}

run().catch(err => {
  console.error('\n❌ Erreur inattendue:', err);
  process.exit(1);
});
