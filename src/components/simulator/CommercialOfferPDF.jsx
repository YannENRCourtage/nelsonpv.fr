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
  const clientAddress = sim.address || selectedProject?.address || (sim.cityName ? `${sim.cityName} (${sim.departmentCode || 'France'})` : 'Adresse du projet');

  // Format A4 Portrait : 210mm x 297mm
  const container = document.createElement('div');
  container.style.width = '210mm';
  container.style.minHeight = '297mm';
  container.style.padding = '12mm 14mm';
  container.style.background = '#ffffff';
  container.style.fontFamily = 'Arial, sans-serif';
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.color = '#0f172a';
  container.style.boxSizing = 'border-box';

  const autoconsoDisplay = sim.autoconsoRate
    ? (sim.autoconsoKwh && sim.autoconsoKwh > 0 ? `${sim.autoconsoRate} % (${sim.autoconsoKwh.toLocaleString('fr-FR')} kWh)` : `${sim.autoconsoRate} %`)
    : '65 %';

  container.innerHTML = `
    <div style="display: flex; flex-direction: column; min-height: 273mm; justify-content: space-between;">
      
      <!-- EN-TÊTE PROFESSIONNEL -->
      <div>
        <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #00429d; padding-bottom: 10px; margin-bottom: 14px;">
          <div>
            <div style="font-size: 22pt; font-weight: 900; color: #00429d; letter-spacing: 0.5px;">NELSON</div>
            <div style="font-size: 8.5pt; color: #64748b; font-weight: bold; text-transform: uppercase; margin-top: 2px;">Étude de Faisabilité &amp; Offre Commerciale</div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 13pt; font-weight: 800; color: #0f172a;">${typeTitle}</div>
            <div style="font-size: 9.5pt; color: #475569; margin-top: 3px;">
              <strong>Client :</strong> ${clientName} &nbsp;|&nbsp; <strong>Date :</strong> ${new Date().toLocaleDateString('fr-FR')}
            </div>
            <div style="font-size: 8.5pt; color: #64748b; margin-top: 2px;"><strong>Adresse :</strong> ${clientAddress}</div>
          </div>
        </div>

        <!-- SYNTHÈSE DES 4 KPIS -->
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 16px;">
          <div style="background: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 12px; padding: 10px 8px; text-align: center;">
            <div style="font-size: 7.5pt; font-weight: bold; color: #64748b; text-transform: uppercase;">Puissance</div>
            <div style="font-size: 15pt; font-weight: 900; color: #00429d; margin: 3px 0;">${sim.kwc ? `${sim.kwc} kWc` : sim.power ? `${sim.power} kW` : '-'}</div>
            <div style="font-size: 7.5pt; color: #64748b;">${sim.roofSurface ? `${sim.roofSurface} m² toiture` : sim.quantity ? `${sim.quantity} borne(s)` : ''}</div>
          </div>

          <div style="background: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 12px; padding: 10px 8px; text-align: center;">
            <div style="font-size: 7.5pt; font-weight: bold; color: #64748b; text-transform: uppercase;">Production Annuelle</div>
            <div style="font-size: 15pt; font-weight: 900; color: #0284c7; margin: 3px 0;">${sim.annualProductionKwh ? `${sim.annualProductionKwh.toLocaleString('fr-FR')} kWh` : sim.annualRevenue ? `${sim.annualRevenue.toLocaleString('fr-FR')} €` : '-'}</div>
            <div style="font-size: 7.5pt; color: #64748b;">Gisement ${sim.regionalBaseYield || 1250} kWh/kWc</div>
          </div>

          <div style="background: #f0fdf4; border: 1.5px solid #bbf7d0; border-radius: 12px; padding: 10px 8px; text-align: center;">
            <div style="font-size: 7.5pt; font-weight: bold; color: #166534; text-transform: uppercase;">Gains / an (An 1)</div>
            <div style="font-size: 15pt; font-weight: 900; color: #16a34a; margin: 3px 0;">+${sim.annualBenefitYear1 ? sim.annualBenefitYear1.toLocaleString('fr-FR') : sim.annualRevenue ? sim.annualRevenue.toLocaleString('fr-FR') : '-'} €</div>
            <div style="font-size: 7.5pt; color: #166534;">Économies annuelles</div>
          </div>

          <div style="background: #faf5ff; border: 1.5px solid #e9d5ff; border-radius: 12px; padding: 10px 8px; text-align: center;">
            <div style="font-size: 7.5pt; font-weight: bold; color: #6b21a8; text-transform: uppercase;">Amortissement</div>
            <div style="font-size: 15pt; font-weight: 900; color: #9333ea; margin: 3px 0;">${sim.paybackYear || 8} ans</div>
            <div style="font-size: 7.5pt; color: #6b21a8;">Invest. : ${sim.totalInvestmentHT ? sim.totalInvestmentHT.toLocaleString('fr-FR') : sim.resteACharge ? sim.resteACharge.toLocaleString('fr-FR') : '-'} € HT</div>
          </div>
        </div>

        <!-- VISUEL SATELLITE HAUTE DÉFINITION -->
        <div style="border: 2px solid #cbd5e1; border-radius: 14px; overflow: hidden; background: #0f172a; margin-bottom: 16px; height: 230px; display: flex; align-items: center; justify-content: center; position: relative;">
          ${sim.mapScreenshot ? `
            <img src="${sim.mapScreenshot}" style="width: 100%; height: 100%; object-fit: cover;" alt="Vue toiture satellite" />
          ` : `
            <div style="color: #94a3b8; font-size: 11pt; text-align: center; padding: 20px;">
              <div style="font-size: 24pt; margin-bottom: 6px;">🛰️</div>
              <strong style="color: #ffffff;">Repérage Satellite du Pan de Toiture</strong>
              <div style="font-size: 8.5pt; margin-top: 4px; color: #94a3b8;">${clientAddress}</div>
            </div>
          `}
          <div style="position: absolute; bottom: 8px; right: 8px; background: rgba(15,23,42,0.85); color: #ffffff; padding: 3px 8px; border-radius: 6px; font-size: 7.5pt; font-weight: bold;">
            Délimitation géodésique : ${sim.roofSurface || 83} m²
          </div>
        </div>

        <!-- TABLEAU DES HYPOTHÈSES TECHNIQUES DE DIMENSIONNEMENT -->
        <div style="background: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 14px; padding: 14px; margin-bottom: 16px;">
          <div style="font-size: 10pt; font-weight: 800; color: #00429d; text-transform: uppercase; border-bottom: 1.5px solid #e2e8f0; padding-bottom: 6px; margin-bottom: 10px;">
            Hypothèses Techniques de Dimensionnement
          </div>

          <table style="width: 100%; font-size: 9pt; border-collapse: collapse;">
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 5px 0; color: #64748b;">Adresse du site :</td>
              <td style="padding: 5px 0; text-align: right; font-weight: bold;">${clientAddress}</td>
            </tr>
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 5px 0; color: #64748b;">Productible solaire calculé :</td>
              <td style="padding: 5px 0; text-align: right; font-weight: bold; color: #0284c7;">
                ${sim.annualProductionKwh ? `${sim.annualProductionKwh.toLocaleString('fr-FR')} kWh / an` : '11 250 kWh / an'}
              </td>
            </tr>
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 5px 0; color: #64748b;">Orientation du pan :</td>
              <td style="padding: 5px 0; text-align: right; font-weight: bold;">${sim.orientationLabel || 'Plein Sud'}</td>
            </tr>
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 5px 0; color: #64748b;">Inclinaison de toiture :</td>
              <td style="padding: 5px 0; text-align: right; font-weight: bold;">${sim.pitch || 30}°</td>
            </tr>
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 5px 0; color: #64748b;">Taux d'autoconsommation :</td>
              <td style="padding: 5px 0; text-align: right; font-weight: bold;">${autoconsoDisplay}</td>
            </tr>
            <tr>
              <td style="padding: 5px 0; color: #64748b;">Coût de l'énergie consommée :</td>
              <td style="padding: 5px 0; text-align: right; font-weight: bold;">0.26 € / kWh (Hypothèse client)</td>
            </tr>
          </table>

          <div style="background: #e0f2fe; border-left: 3.5px solid #0284c7; padding: 8px 10px; border-radius: 8px; font-size: 8pt; color: #0369a1; margin-top: 10px;">
            💡 <em>Étude indicative calculée sur la base des données satellitaires haute précision et des tarifs en vigueur.</em>
          </div>
        </div>
      </div>

      <!-- PIED DE PAGE PROFESSIONNEL (SANS TÉLÉPHONE) -->
      <div style="display: flex; justify-content: space-between; align-items: center; border-top: 2px solid #00429d; padding-top: 8px; font-size: 8pt; color: #475569;">
        <span style="font-weight: bold; color: #00429d;">NELSON — nelsonpv.fr</span>
        <span>Courtage en Énergies Renouvelables &amp; Ingénierie Solaire</span>
        <span>contact@enr-courtage.fr</span>
      </div>

    </div>
  `;

  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff'
    });

    const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
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
