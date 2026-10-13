/**
 * ═══════════════════════════════════════════════════════════════════════════
 * BESS PDF PROSPECTING GENERATOR
 * Générateur de courrier de prospection foncière BESS (Batterie de soutien réseau)
 * Format : Page 1 = Lettre personnalisée nominative AFNOR (DL / C5)
 * Optionnel : Page 2 = Document brochure "Brochure ENR Courtage _ Batterie de soutien réseau V3.pdf"
 * ═══════════════════════════════════════════════════════════════════════════
 */

import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { PDFDocument } from 'pdf-lib';
import { ENR_COURTAGE_LOGO_BASE64 } from '@/assets/logoBase64.js';

const BROCHURE_FILE_PATH = '/Brochure ENR Courtage _ Batterie de soutien réseau V3.pdf';

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

  // Conteneur DOM temporaire pour le rendu HTML
  const pageContainer = document.createElement('div');
  pageContainer.style.position = 'fixed';
  pageContainer.style.left = '-9999px';
  pageContainer.style.top = '0';
  pageContainer.style.width = '210mm';
  pageContainer.style.height = '297mm';
  pageContainer.style.backgroundColor = '#ffffff';
  pageContainer.style.zIndex = '-1000';

  const letterSubject = parcelLabel
    ? `Proposition de location foncière — Installation d'une batterie de soutien réseau (Parcelle ${parcelLabel})`
    : `Proposition de location foncière — Implantation d'une batterie de soutien réseau Enedis`;

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
      <div style="position: absolute; top: 45mm; right: 20mm; width: 85mm; height: 45mm; max-height: 45mm; box-sizing: border-box; overflow: hidden; font-family: Arial, sans-serif; text-align: left; padding: 2mm 0 0 2mm;">
        ${afnorLines.map((line, idx) => {
          if (idx === 0) {
            return `<div style="font-size: 10pt; font-weight: 900; color: #0f172a; margin-bottom: 2px; line-height: 1.2; text-transform: uppercase;">${line}</div>`;
          }
          return `<div style="font-size: 9.2pt; color: #334155; line-height: 1.35;">${line}</div>`;
        }).join('')}
      </div>

      <!-- CORPS DU COURRIER (TOP 99MM JUSQU'À BOTTOM 16MM) -->
      <div style="position: absolute; top: 97mm; left: 20mm; right: 20mm; bottom: 16mm; display: flex; flex-direction: column; justify-content: space-between; box-sizing: border-box;">
        <div>
          <!-- OBJET DU COURRIER -->
          <div style="background: #eff6ff; border-left: 4px solid #00429d; padding: 6px 12px; border-radius: 0 6px 6px 0; margin-bottom: 9px;">
            <div style="font-size: 9.6pt; font-weight: 900; color: #00429d; line-height: 1.3;">
              Objet : ${letterSubject}
            </div>
          </div>

          <!-- TEXTE PRINCIPAL -->
          <div style="font-size: 8.9pt; line-height: 1.44; color: #1e293b; text-align: justify;">
            <p style="margin: 0 0 8px 0; font-weight: bold; color: #0f172a;">Madame, Monsieur,</p>

            <p style="margin: 0 0 8px 0;">
              Dans le cadre de l’accélération de la transition énergétique et de l'intégration croissante des énergies renouvelables, le réseau public de distribution d'électricité (Enedis) fait face à des besoins majeurs de régulation et de soutien de tension local.
            </p>

            <p style="margin: 0 0 8px 0;">
              Notre analyse cartographique et spatiale a identifié la présence d'un <strong>transformateur HTA/BT au sol directement raccordé en souterrain</strong> au réseau haute tension sur votre parcelle située au <strong>${targetAddress}${targetCity ? `, ${targetCity}` : ''}</strong>${parcelLabel ? ` (référence cadastrale : <strong>${parcelLabel}</strong>)` : ''}.
            </p>

            <p style="margin: 0 0 8px 0;">
              Cette proximité réseau immédiate rend votre terrain idéal pour l’accueil d’une <strong>unité autonome de stockage par batterie (BESS) de soutien réseau</strong> d’une puissance de <strong>500 kW (4 armoires CESC de 125 kW)</strong>.
            </p>

            <!-- CADRE OFFRE FINANCIÈRE -->
            <div style="background: #f0fdf4; border: 1.5px solid #86efac; border-radius: 8px; padding: 8px 12px; margin: 8px 0;">
              <div style="font-size: 9.5pt; font-weight: 900; color: #15803d; margin-bottom: 4px; text-transform: uppercase;">
                Notre proposition de bail notarié ferme :
              </div>
              <div style="font-size: 9pt; color: #166534; line-height: 1.4;">
                &bull; <strong>Loyer garanti de 2 000 € net / an</strong> pendant <strong>20 ans</strong> (soit <strong>40 000 € garantis</strong> au total).<br/>
                &bull; <strong>Emprise au sol très réduite : 20 m² seulement</strong> sur dalle béton sécurisée.<br/>
                &bull; <strong>Zéro investissement ni frais</strong> pour vous : ENR Courtage prend en charge 100 % des démarches, de l'installation, du raccordement et de la maintenance.
              </div>
            </div>

            <!-- CADRE ATOUTS BATTERIE DE SOUTIEN RÉSEAU -->
            <div style="background: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 8px; padding: 8px 12px; margin: 8px 0;">
              <div style="font-size: 9.2pt; font-weight: 800; color: #00429d; margin-bottom: 4px; text-transform: uppercase;">
                Les atouts concrets de l'installation pour votre propriété :
              </div>
              <ul style="margin: 0; padding-left: 16px; font-size: 8.6pt; line-height: 1.4; color: #334155;">
                <li style="margin-bottom: 4px;">
                  <strong>Soutien au réseau électrique :</strong> absorption des surplus et restitution aux heures de pointe pour stabiliser la fréquence (50 Hz).
                </li>
                <li style="margin-bottom: 4px;">
                  <strong>Sécurité et intégration soignée :</strong> zone privative entièrement clôturée par grillage rigide thermolaqué (hauteur 2 m), système d'extinction NFPA 855 asservi et surveillance 24h/24.
                </li>
                <li style="margin-bottom: 0;">
                  <strong>Valorisation d'un délaissé foncier :</strong> aucun impact sur vos activités agricoles ou artisanales environnantes.
                </li>
              </ul>
            </div>

            <p style="margin: 8px 0;">
              Vous trouverez ci-joint notre brochure descriptive de présentation complète de la solution de soutien réseau.
            </p>

            <p style="margin: 8px 0 0 0;">
              Je me tiens à votre disposition au <strong>07 63 87 71 40</strong> pour échanger sur ce projet et répondre à toutes vos questions.
            </p>
          </div>
        </div>

        <!-- SIGNATURE -->
        <div style="display: flex; justify-content: flex-end; align-items: flex-end; padding-top: 4px;">
          <div style="text-align: right; min-width: 210px;">
            <div style="font-size: 10.5pt; font-weight: 900; color: #00429d;">Yann BARBERIS</div>
            <div style="font-size: 8.8pt; color: #475569; font-weight: bold; margin-top: 1px;">Directeur Développement &amp; M&amp;A Infrastructure</div>
            <div style="font-size: 8.6pt; color: #0284c7; font-weight: bold; margin-top: 1px;">07 63 87 71 40</div>
            <div style="font-size: 8.2pt; color: #64748b;">y.barberis@enr-courtage.fr</div>
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
      const copiedPages = await letterDoc.copyPages(brochureDoc, brochureDoc.getPageIndices());
      copiedPages.forEach((page) => letterDoc.addPage(page));
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
