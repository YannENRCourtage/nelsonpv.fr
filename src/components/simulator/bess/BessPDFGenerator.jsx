/**
 * ═══════════════════════════════════════════════════════════════════════════
 * BESS PDF PROSPECTING GENERATOR
 * Générateur de courrier de prospection foncière BESS (Batterie de soutien réseau)
 * Format : Page 1 = Lettre personnalisée nominative AFNOR avec encart cartographique
 *          Page 2 = Flyer officiel en Portrait A4 pour impression Recto/Verso parfaite
 * ═══════════════════════════════════════════════════════════════════════════
 */

import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { PDFDocument, degrees } from 'pdf-lib';
import { ENR_COURTAGE_LOGO_BASE64 } from '@/assets/logoBase64.js';

const BROCHURE_FILE_PATH = '/Brochure ENR Courtage _ Batterie de soutien réseau V3.pdf';

/**
 * Génère une image statique du site (satellite Esri + contour cadastral cyan + marqueur transfo rouge)
 * @param {Object} params - { lat, lng, parcelGeometry, parcelLabel, city }
 * @returns {Promise<string|null>} DataURL base64 JPEG ou null
 */
export async function generateStaticMapImage({ lat, lng, parcelGeometry, parcelLabel, city }) {
  if (!lat || !lng || isNaN(Number(lat)) || isNaN(Number(lng))) return null;

  try {
    const numLat = Number(lat);
    const numLng = Number(lng);
    const dLat = 0.0011;
    const dLng = dLat * 1.8;
    const minLng = numLng - dLng;
    const minLat = numLat - dLat;
    const maxLng = numLng + dLng;
    const maxLat = numLat + dLat;

    const width = 800;
    const height = 260;

    const esriUrl = `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/export?bbox=${minLng},${minLat},${maxLng},${maxLat}&bboxSR=4326&imageSR=4326&size=${width},${height}&format=png&f=image`;

    const res = await fetch(esriUrl);
    if (!res.ok) return null;
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);

    const img = new Image();
    await new Promise((resolve, reject) => {
      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        resolve();
      };
      img.onerror = (e) => {
        URL.revokeObjectURL(objectUrl);
        reject(e);
      };
      img.src = objectUrl;
    });

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    // 1. Fond satellite Esri
    ctx.drawImage(img, 0, 0, width, height);

    // Fonction de conversion GPS -> Coordonnées Canvas
    const toPx = (pLng, pLat) => {
      const px = ((pLng - minLng) / (maxLng - minLng)) * width;
      const py = ((maxLat - pLat) / (maxLat - minLat)) * height;
      return [px, py];
    };

    // 2. Contour de la parcelle cadastrale (Cyan / Bleu fluorescent)
    if (parcelGeometry && parcelGeometry.coordinates) {
      const rings = parcelGeometry.type === 'MultiPolygon'
        ? parcelGeometry.coordinates.flat(1)
        : (parcelGeometry.coordinates || []);

      for (const ring of rings) {
        if (!Array.isArray(ring) || ring.length < 3) continue;
        ctx.beginPath();
        const [startX, startY] = toPx(ring[0][0], ring[0][1]);
        ctx.moveTo(startX, startY);
        for (let i = 1; i < ring.length; i++) {
          const [rx, ry] = toPx(ring[i][0], ring[i][1]);
          ctx.lineTo(rx, ry);
        }
        ctx.closePath();

        // Remplissage semi-transparent cyan
        ctx.fillStyle = 'rgba(2, 132, 199, 0.28)';
        ctx.fill();

        // Contour pointillé cyan vif
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 3.5;
        ctx.setLineDash([8, 6]);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    // 3. Marqueur Transformateur Sol (Carré rouge avec éclair et badge SOL)
    const [tx, ty] = toPx(numLng, numLat);
    const boxSize = 34;

    ctx.save();
    ctx.shadowColor = 'rgba(239, 68, 68, 0.9)';
    ctx.shadowBlur = 14;
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(tx - boxSize / 2, ty - boxSize / 2, boxSize, boxSize);

    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.strokeRect(tx - boxSize / 2, ty - boxSize / 2, boxSize, boxSize);

    // Éclair ⚡
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('⚡', tx, ty);

    // Badge "SOL"
    ctx.fillStyle = '#10b981';
    ctx.fillRect(tx + 6, ty - 18, 22, 12);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.strokeRect(tx + 6, ty - 18, 22, 12);
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 9px sans-serif';
    ctx.fillText('SOL', tx + 17, ty - 12);
    ctx.restore();

    // 4. Bandeau supérieur ou inférieur avec informations cadastrales
    ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
    ctx.fillRect(0, height - 26, width, 26);
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 11.5px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    const parcelText = parcelLabel ? `Parcelle ${parcelLabel}` : 'Parcelle Cadastrale';
    const cityText = city ? `(${city})` : '';
    ctx.fillText(
      `📍 Transformateur HTA/BT au Sol (Souterrain) • ${parcelText} ${cityText} • Coordonnées : ${numLat.toFixed(5)}, ${numLng.toFixed(5)}`,
      10,
      height - 13
    );

    return canvas.toDataURL('image/jpeg', 0.92);
  } catch (err) {
    console.warn('[BessPDF] Erreur génération carte statique:', err);
    return null;
  }
}

/**
 * Génère le Blob PDF pour un prospect BESS (lettre seule ou lettre + brochure)
 * @param {Object} prospect - Données du prospect (nom_societe, nom, adresse, commune, parcelle, etc.)
 * @param {Object} [options] - Options ({ includeBrochure: true/false })
 * @returns {Promise<{ blob: Blob, filename: string }>}
 */
export async function generateBessProspectingPdfBlob(prospect, options = {}) {
  const includeBrochure = options.includeBrochure !== undefined ? Boolean(options.includeBrochure) : true;

  const targetCompany = (
    prospect.nom_societe ||
    prospect.denomination ||
    prospect.ownerName ||
    prospect.clientName ||
    ''
  ).trim();

  const targetContact = (
    prospect.nom ||
    prospect.contact ||
    (targetCompany ? '' : 'Madame, Monsieur le Propriétaire')
  ).trim();

  const targetAddress = (
    prospect.adresse_ligne1 ||
    prospect.adresse ||
    prospect.address ||
    'Votre parcelle'
  ).trim();

  const targetPostalCode = (prospect.code_postal || prospect.postalCode || '').trim();
  const targetCity = (prospect.ville || prospect.cityName || prospect.nomCommune || '').trim().toUpperCase();

  const parcelLabel = prospect.parcelId || prospect.codeParcelle || prospect.section ? `${prospect.section || ''} ${prospect.numero || ''}`.trim() : '';

  const formattedDate = new Date().toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  // Construction du bloc adresse AFNOR (Enveloppe DL / C5 avec fenêtre à droite)
  const afnorLines = [];
  if (targetCompany) {
    afnorLines.push(targetCompany.toUpperCase());
  }
  if (targetContact && targetContact !== targetCompany) {
    afnorLines.push(targetContact);
  }
  if (targetAddress) {
    afnorLines.push(targetAddress);
  }
  const cityLine = [targetPostalCode, targetCity].filter(Boolean).join(' ');
  if (cityLine) {
    afnorLines.push(cityLine);
  }
  afnorLines.push('FRANCE');

  // Génération de l'image de la carte du transformateur et de la parcelle
  const mapImageBase64 = await generateStaticMapImage({
    lat: prospect.lat || (prospect.coords ? prospect.coords[0] : null),
    lng: prospect.lng || (prospect.coords ? prospect.coords[1] : null),
    parcelGeometry: prospect.parcelGeometry || null,
    parcelLabel,
    city: targetCity
  });

  // Conteneur DOM temporaire pour le rendu HTML de la page 1
  const pageContainer = document.createElement('div');
  pageContainer.style.position = 'fixed';
  pageContainer.style.left = '-9999px';
  pageContainer.style.top = '0';
  pageContainer.style.width = '210mm';
  pageContainer.style.height = '297mm';
  pageContainer.style.backgroundColor = '#ffffff';
  pageContainer.style.zIndex = '-1000';

  pageContainer.innerHTML = `
    <div style="width: 210mm; min-height: 297mm; max-height: 297mm; height: 297mm; box-sizing: border-box; background-color: #ffffff; color: #0f172a; font-family: Arial, sans-serif; position: relative; overflow: hidden;">

      <!-- BLOC EXPÉDITEUR ENR COURTAGE (HAUT GAUCHE, HORS ZONE AFNOR) -->
      <div style="position: absolute; top: 15mm; left: 20mm; width: 85mm; box-sizing: border-box; font-family: Arial, sans-serif;">
        <img src="${ENR_COURTAGE_LOGO_BASE64}" alt="ENR COURTAGE" style="height: 38px; width: auto; object-fit: contain; margin-bottom: 5px; display: block;" />
        <div style="font-size: 8.2pt; color: #475569; line-height: 1.4;">
          <strong style="color: #00429d; font-size: 8.8pt;">ENR COURTAGE</strong><br/>
          7 Rue Gutenberg &bull; 33700 MÉRIGNAC<br/>
          contact@enr-courtage.fr &bull; 07 63 87 71 40<br/>
          <span style="color: #0284c7; font-weight: bold;">www.enr-courtage.fr</span>
        </div>
      </div>

      <!-- DATE & LIEU (ALIGNÉ À GAUCHE) -->
      <div style="position: absolute; top: 48mm; left: 20mm; font-size: 9.5pt; color: #475569; text-align: left;">
        Mérignac, le ${formattedDate}
      </div>

      <!-- BLOC DESTINATAIRE AFNOR NF Z 10-011 (HAUT DROIT, FENÊTRE DL / C5) -->
      <div style="position: absolute; top: 44mm; right: 20mm; width: 85mm; height: 45mm; max-height: 45mm; box-sizing: border-box; overflow: hidden; font-family: Arial, sans-serif; text-align: left; padding: 2mm 0 0 2mm;">
        ${afnorLines.map((line, idx) => {
          if (idx === 0) {
            return `<div style="font-size: 10pt; font-weight: 900; color: #0f172a; margin-bottom: 2px; line-height: 1.2; text-transform: uppercase;">${line}</div>`;
          }
          return `<div style="font-size: 9.2pt; color: #334155; line-height: 1.35;">${line}</div>`;
        }).join('')}
      </div>

      <!-- CORPS DU COURRIER (TOP 76MM JUSQU'À BOTTOM 14MM) -->
      <div style="position: absolute; top: 76mm; left: 20mm; right: 20mm; bottom: 14mm; display: flex; flex-direction: column; justify-content: space-between; box-sizing: border-box;">
        <div>
          <!-- TEXTE PRINCIPAL SANS OBJET POUR GAGNER DE LA PLACE -->
          <div style="font-size: 8.7pt; line-height: 1.38; color: #1e293b; text-align: justify;">
            <p style="margin: 0 0 6px 0; font-weight: bold; color: #0f172a; font-size: 9.2pt;">Madame, Monsieur,</p>

            <p style="margin: 0 0 6px 0;">
              Dans le cadre du renforcement et de la stabilisation du réseau public de distribution d'électricité (Enedis), nous avons identifié la présence d'un <strong>transformateur HTA/BT au sol directement raccordé en souterrain</strong> au réseau haute tension sur votre parcelle située au <strong>${targetAddress}${targetCity ? `, ${targetCity}` : ''}</strong>${parcelLabel ? ` (référence cadastrale : <strong>${parcelLabel}</strong>)` : ''}.
            </p>

            <p style="margin: 0 0 6px 0;">
              Cette proximité réseau immédiate rend votre terrain idéal pour l’accueil d’une <strong>unité autonome de stockage par batterie (BESS)</strong> de soutien réseau d’une puissance de <strong>500 kW / 1 044 kWh</strong> (4 armoires de 125 kW).
            </p>

            <!-- ENCART CARTE DU TRANSFORMATEUR ET DE LA PARCELLE -->
            ${mapImageBase64 ? `
              <div style="margin: 8px 0 12px 0; border: 1.5px solid #cbd5e1; border-radius: 6px; overflow: hidden; background: #0f172a; box-shadow: 0 1px 4px rgba(0,0,0,0.08); max-height: 50mm;">
                <img src="${mapImageBase64}" style="width: 100%; max-height: 50mm; object-fit: cover; display: block;" />
              </div>
            ` : ''}

            <!-- CADRE OFFRE FINANCIÈRE -->
            <div style="background: #f0fdf4; border: 1.5px solid #86efac; border-radius: 6px; padding: 7px 12px; margin: 12px 0 12px 0;">
              <div style="font-size: 9.2pt; font-weight: 900; color: #15803d; margin-bottom: 3px; text-transform: uppercase;">
                Notre proposition de bail notarié :
              </div>
              <div style="font-size: 8.6pt; color: #166534; line-height: 1.38;">
                &bull; <strong>Loyer garanti de 2 000 € net / an</strong> pendant <strong>20 ans</strong> (soit <strong>40 000 € garantis</strong> au total).<br/>
                &bull; <strong>Emprise au sol très réduite : 20 m² seulement</strong> sur dalle béton clôturée (Visuel ci-après).<br/>
                &bull; <strong>Zéro investissement ni frais</strong> : ENR Courtage prend en charge 100 % des démarches, de l'installation, du raccordement et de la maintenance.
              </div>
            </div>

            <!-- CADRE ATOUTS BATTERIE DE SOUTIEN RÉSEAU -->
            <div style="background: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 6px; padding: 7px 12px; margin: 12px 0 10px 0;">
              <div style="font-size: 8.9pt; font-weight: 800; color: #00429d; margin-bottom: 3px; text-transform: uppercase;">
                Les atouts concrets de l'installation pour votre propriété :
              </div>
              <div style="font-size: 8.4pt; line-height: 1.38; color: #334155;">
                &bull; <strong>Soutien au réseau électrique :</strong> absorption des surplus et restitution aux heures de pointe pour stabiliser la tension (50 Hz).<br/>
                &bull; <strong>Sécurité &amp; intégration soignée :</strong> zone clôturée (grillage rigide H 2m), extinction automatique NFPA 855 asservie.<br/>
                &bull; <strong>Valorisation d'un délaissé foncier :</strong> aucun impact sur vos activités et aucune servitude gênante.
              </div>
            </div>

            <p style="margin: 10px 0 4px 0; font-size: 8.7pt;">
              Vous trouverez ci-joint notre brochure descriptive de présentation complète de la solution de soutien réseau.
            </p>

            <p style="margin: 0; font-size: 8.7pt;">
              Je me tiens à votre disposition au <strong>07 63 87 71 40</strong> pour échanger sur ce projet et répondre à toutes vos questions.
            </p>
          </div>
        </div>

        <!-- SIGNATURE -->
        <div style="display: flex; justify-content: flex-end; align-items: flex-end; padding-top: 6px;">
          <div style="text-align: right; min-width: 210px;">
            <div style="font-size: 10pt; font-weight: 900; color: #00429d;">Yann BARBERIS</div>
            <div style="font-size: 8.6pt; color: #475569; font-weight: bold; margin-top: 1px;">Directeur Développement</div>
            <div style="font-size: 8.5pt; color: #0284c7; font-weight: bold; margin-top: 1px;">07 63 87 71 40</div>
            <div style="font-size: 8.1pt; color: #64748b;">y.barberis@enr-courtage.fr</div>
          </div>
        </div>
      </div>

    </div>
  `;

  document.body.appendChild(pageContainer);

  let letterPdfBytes;
  try {
    const canvas = await html2canvas(pageContainer, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      width: 794,
      windowWidth: 794
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });
    pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297);
    letterPdfBytes = pdf.output('arraybuffer');
  } finally {
    document.body.removeChild(pageContainer);
  }

  const cleanName = (targetCompany || targetContact || 'Bailleur').replace(/[^a-zA-Z0-9]/g, '_');
  const filename = `Courrier_BESS_Batterie_Soutien_Reseau_${cleanName}.pdf`;

  // Si l'option brochure est désactivée, retourner directement la lettre
  if (!includeBrochure) {
    const blob = new Blob([letterPdfBytes], { type: 'application/pdf' });
    return { blob, filename, arrayBuffer: letterPdfBytes };
  }

  // Fusion de la lettre (Page 1) et de la brochure PDF (Page 2) avec pdf-lib
  // Important : la page 2 (flyer) est ajoutée en Portrait A4 dans le même sens que le courrier pour une impression Recto-Verso parfaite
  try {
    const letterDoc = await PDFDocument.load(letterPdfBytes);

    let brochureBytes = null;
    try {
      const response = await fetch(BROCHURE_FILE_PATH);
      if (response.ok) {
        brochureBytes = await response.arrayBuffer();
      }
    } catch (fetchErr) {
      console.warn('[BessPDF] Impossible de charger la brochure depuis public:', fetchErr);
    }

    if (brochureBytes) {
      const brochureDoc = await PDFDocument.load(brochureBytes);
      const embeddedPage = await letterDoc.embedPage(brochureDoc.getPages()[0]);
      
      // Page 2 : A4 Portrait (595.28 x 841.89 pt) avec le flyer orienté dans le même sens que le courrier
      const versoPage = letterDoc.addPage([595.28, 841.89]);
      versoPage.drawPage(embeddedPage, {
        x: 595.28,
        y: 0,
        width: 841.89,
        height: 595.28,
        rotate: degrees(90)
      });
    }

    const mergedBytes = await letterDoc.save();
    const blob = new Blob([mergedBytes], { type: 'application/pdf' });
    return { blob, filename, arrayBuffer: mergedBytes };
  } catch (mergeErr) {
    console.error('[BessPDF] Erreur fusion avec la brochure:', mergeErr);
    const blob = new Blob([letterPdfBytes], { type: 'application/pdf' });
    return { blob, filename, arrayBuffer: letterPdfBytes };
  }
}
