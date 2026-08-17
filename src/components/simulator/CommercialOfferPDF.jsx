import React from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export const generateCommercialOfferPDF = async ({ simulation, selectedProject }) => {
  if (!simulation) return;

  const sim = simulation;
  const isAuto = sim.type === 'autoconsommation' || sim.projectType === 'solar';
  const isToiture = sim.type === 'toiture_pv';
  const isStruct = sim.type === 'structure_metallique';
  const isIrve = sim.type === 'irve' || sim.projectType === 'irve';

  const typeTitle = isAuto ? 'Autoconsommation Photovoltaïque'
    : isToiture ? 'Toiture Photovoltaïque (Revente Totale / Loyer)'
    : isStruct ? 'Structure Métallique & Hangar Solaire'
    : 'Infrastructure de Recharge Véhicules Électriques (IRVE)';

  const clientName = selectedProject?.name || selectedProject?.lastName || sim.cityName || 'Client Privé';
  const clientAddress = sim.address || selectedProject?.address || 'Site du Projet';

  // Container virtuel DOM pour le rendu HTML -> PDF A4 Paysage (297mm x 210mm)
  const container = document.createElement('div');
  container.style.width = '297mm';
  container.style.minHeight = '210mm';
  container.style.padding = '12mm 15mm';
  container.style.background = '#ffffff';
  container.style.fontFamily = 'Arial, sans-serif';
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.color = '#0f172a';
  container.style.boxSizing = 'border-box';

  container.innerHTML = `
    <div style="display: flex; flex-direction: column; height: 100%; justify-content: space-between;">
      
      <!-- EN-TÊTE PROFESSIONNEL -->
      <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2.5px solid #00429d; padding-bottom: 8px; margin-bottom: 12px;">
        <div>
          <div style="font-size: 20pt; font-weight: 900; color: #00429d; letter-spacing: 0.5px;">NELSON</div>
          <div style="font-size: 8pt; color: #64748b; font-weight: bold; text-transform: uppercase;">Étude de Faisabilité &amp; Offre Commerciale</div>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 13pt; font-weight: 800; color: #0f172a;">${typeTitle}</div>
          <div style="font-size: 9pt; color: #475569; margin-top: 2px;">
            <strong>Client :</strong> ${clientName} &nbsp;|&nbsp; <strong>Date :</strong> ${new Date().toLocaleDateString('fr-FR')}
          </div>
          <div style="font-size: 8pt; color: #64748b;">${clientAddress}</div>
        </div>
      </div>

      <!-- SYNTHÈSE DES KPIS -->
      <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 12px;">
        <div style="background: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 12px; padding: 10px; text-align: center;">
          <div style="font-size: 7.5pt; font-weight: bold; color: #64748b; text-transform: uppercase;">Puissance Installée</div>
          <div style="font-size: 16pt; font-weight: 900; color: #00429d; margin: 3px 0;">${sim.kwc ? `${sim.kwc} kWc` : sim.power ? `${sim.power} kW` : '-'}</div>
          <div style="font-size: 7pt; color: #64748b;">${sim.roofSurface ? `${sim.roofSurface} m² de toiture` : sim.quantity ? `${sim.quantity} borne(s)` : ''}</div>
        </div>

        <div style="background: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 12px; padding: 10px; text-align: center;">
          <div style="font-size: 7.5pt; font-weight: bold; color: #64748b; text-transform: uppercase;">Production Annuelle</div>
          <div style="font-size: 16pt; font-weight: 900; color: #0284c7; margin: 3px 0;">${sim.annualProductionKwh ? `${sim.annualProductionKwh.toLocaleString('fr-FR')} kWh` : sim.annualRevenue ? `${sim.annualRevenue.toLocaleString('fr-FR')} €` : '-'}</div>
          <div style="font-size: 7pt; color: #64748b;">Ensoleillement : ${sim.regionalBaseYield || 1250} kWh/kWc</div>
        </div>

        <div style="background: #f0fdf4; border: 1.5px solid #bbf7d0; border-radius: 12px; padding: 10px; text-align: center;">
          <div style="font-size: 7.5pt; font-weight: bold; color: #166534; text-transform: uppercase;">Gains / an (An 1)</div>
          <div style="font-size: 16pt; font-weight: 900; color: #16a34a; margin: 3px 0;">+${sim.annualBenefitYear1 ? sim.annualBenefitYear1.toLocaleString('fr-FR') : sim.annualRevenue ? sim.annualRevenue.toLocaleString('fr-FR') : '-'} €</div>
          <div style="font-size: 7pt; color: #166534;">Économies + Vente réseau</div>
        </div>

        <div style="background: #faf5ff; border: 1.5px solid #e9d5ff; border-radius: 12px; padding: 10px; text-align: center;">
          <div style="font-size: 7.5pt; font-weight: bold; color: #6b21a8; text-transform: uppercase;">Retour sur Investissement</div>
          <div style="font-size: 16pt; font-weight: 900; color: #9333ea; margin: 3px 0;">${sim.paybackYear || 8} ans</div>
          <div style="font-size: 7pt; color: #6b21a8;">Investissement : ${sim.totalInvestmentHT ? sim.totalInvestmentHT.toLocaleString('fr-FR') : sim.resteACharge ? sim.resteACharge.toLocaleString('fr-FR') : '-'} € HT</div>
        </div>
      </div>

      <!-- CORPS : VISUEL SATELLITE / 3D + HYPOTHÈSES TECHNIQUES -->
      <div style="display: grid; grid-template-columns: 1.2fr 1fr; gap: 12px; margin-bottom: 12px; flex: 1;">
        
        <!-- VISUEL CONTEXTUEL -->
        <div style="border: 1.5px solid #cbd5e1; border-radius: 14px; overflow: hidden; background: #0f172a; display: flex; flex-direction: column; justify-content: center; align-items: center; min-height: 200px;">
          ${sim.mapScreenshot ? `
            <img src="${sim.mapScreenshot}" style="width: 100%; height: 100%; object-fit: cover;" alt="Repérage toiture satellite" />
          ` : `
            <div style="color: #94a3b8; font-size: 10pt; text-align: center; padding: 20px;">
              <div style="font-size: 18pt; margin-bottom: 4px;">🛰️</div>
              <strong>Vue Satellite Haute Résolution</strong>
              <div style="font-size: 8pt; margin-top: 4px; color: #64748b;">Délimitation géodésique du pan de toiture</div>
            </div>
          `}
        </div>

        <!-- TABLEAU DES HYPOTHÈSES TECHNIQUES -->
        <div style="background: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 14px; padding: 12px; display: flex; flex-direction: column; justify-content: space-between;">
          <div style="font-size: 9pt; font-weight: 800; color: #00429d; text-transform: uppercase; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; margin-bottom: 8px;">
            Hypothèses Techniques de Dimensionnement
          </div>

          <table style="width: 100%; font-size: 8pt; border-collapse: collapse;">
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 4px 0; color: #64748b;">Localisation & Département :</td>
              <td style="padding: 4px 0; text-align: right; font-weight: bold;">${sim.cityName || 'France'} (${sim.departmentCode || '32'})</td>
            </tr>
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 4px 0; color: #64748b;">Productible solaire de base :</td>
              <td style="padding: 4px 0; text-align: right; font-weight: bold;">${sim.regionalBaseYield || 1250} kWh / kWc / an</td>
            </tr>
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 4px 0; color: #64748b;">Orientation du pan :</td>
              <td style="padding: 4px 0; text-align: right; font-weight: bold;">${sim.orientationLabel || 'Plein Sud'} (Coeff ${sim.orientationCoeff || 1.0})</td>
            </tr>
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 4px 0; color: #64748b;">Inclinaison de toiture :</td>
              <td style="padding: 4px 0; text-align: right; font-weight: bold;">${sim.pitch || 30}° (Coeff ${sim.inclinationCoeff || 1.0})</td>
            </tr>
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 4px 0; color: #64748b;">Taux d'autoconsommation :</td>
              <td style="padding: 4px 0; text-align: right; font-weight: bold;">${sim.autoconsoRate || 65} % (${sim.autoconsoKwh || 0} kWh)</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; color: #64748b;">Valorisation surplus injecté :</td>
              <td style="padding: 4px 0; text-align: right; font-weight: bold;">0.13 €/kWh (Contrat EDF OA)</td>
            </tr>
          </table>

          <div style="background: #e0f2fe; border-left: 3px solid #0284c7; padding: 6px 8px; border-radius: 6px; font-size: 7.5pt; color: #0369a1; margin-top: 6px;">
            💡 <em>Étude indicative réalisée sur la base des données satellitaires IGN/Google et des tarifs d'achat en vigueur.</em>
          </div>
        </div>
      </div>

      <!-- FOOTER -->
      <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1.5px solid #00429d; padding-top: 6px; font-size: 7.5pt; color: #475569;">
        <span style="font-weight: bold; color: #00429d;">NELSON — nelsonpv.fr</span>
        <span>Courtage en Énergies Renouvelables &amp; Ingénierie Solaire</span>
        <span>contact@enr-courtage.fr | 05 56 00 00 00</span>
      </div>

    </div>
  `;

  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff'
    });

    const pdf = new jsPDF({ orientation: 'l', unit: 'mm', format: 'a4' });
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const imgData = canvas.toDataURL('image/jpeg', 0.95);

    pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);

    const safeTitle = (sim.title || 'Offre_Commerciale_Solaire').replace(/[^a-zA-Z0-9_-]/g, '_');
    pdf.save(`${safeTitle}_${new Date().toISOString().split('T')[0]}.pdf`);
  } catch (err) {
    console.error('Erreur export PDF Commercial Offer:', err);
  } finally {
    document.body.removeChild(container);
  }
};
