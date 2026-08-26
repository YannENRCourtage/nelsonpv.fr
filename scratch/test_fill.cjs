const fs = require('fs');
const { PDFDocument, PDFName, PDFString } = require('pdf-lib');

async function testFill() {
  const bytes = fs.readFileSync('public/cerfa_16702-02.pdf');
  const pdfDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const form = pdfDoc.getForm();

  const setField = (name, val, fontSize = null) => {
    if (!val && val !== 0) return;
    try {
      const f = form.getTextField(name);
      if (f) {
        if (fontSize) {
          try {
            f.acroField.dict.set(PDFName.of('DA'), PDFString.of('/Helv ' + fontSize + ' Tf 0 g'));
            f.setFontSize(fontSize);
          } catch (_) {}
        }
        f.setText(String(val));
        console.log('Set text', name, '->', val);
      }
    } catch (e) {
      console.log('Error setField', name, e.message);
    }
  };

  const setCheck = (name, checked = true) => {
    try {
      const cb = form.getCheckBox(name);
      if (cb) {
        checked ? cb.check() : cb.uncheck();
        console.log('Set check', name, '->', checked);
      }
    } catch (e) {
      console.log('Error setCheck', name, e.message);
    }
  };

  // Page 2: Identité
  setCheck('D1H_homme', true);
  setField('D1N_nom', 'SAINT ARAILLES', 9.5);
  setField('D1P_prenom', 'Henri', 9.5);
  setField('D1A_naissance', '14/02/1970', 9);
  setField('D1C_commune', 'AUCH', 9); // Birth city ONLY
  setField('D1D_dept', '32', 9);
  setField('D1E_pays', 'FRANCE', 9);

  // Coordonnées déclarant
  setField('D3N_numero', '2910', 9.5);
  setField('D3V_voie', "Chemin de l'osse", 9.5);
  setField('D3L_localite', 'CONDOM', 9.5);
  setField('D3C_code', '32100', 9.5);
  setField('D3T_telephone', '06 65 11 03 00', 9.5);
  setField('D3P_pays', 'FRANCE', 9.5);
  setField('D5GE1_email', 'henri.starailes', 8.5);
  setField('D5GE2_email', 'ntymall.com', 8.5);

  // Page 2: Checkbox acceptation électronique
  setCheck('D5A_acceptation', true);

  // Page 3: Terrain
  setField('T2Q_numero', '2910', 9.5);
  setField('T2V_voie', "Chemin de l'osse", 9.5);
  setField('T2L_localite', 'CONDOM', 9.5);
  setField('T2C_code', '32100', 9.5);

  // Cadastre
  setField('T2S_section', '0K', 9.5);
  setField('T2N_numero', '0078', 9.5);
  setField('T2T_superficie', '47410', 9.5);
  setField('D5T_total', '47410', 9.5);

  // Section 3.2: Je ne sais pas partout
  setCheck('T3B_CUnc', true);
  setCheck('T3S_lotnc', true);
  setCheck('T3T_ZACnc', true);
  setCheck('T3E_AFUnc', true);
  setCheck('T3F_PUPnc', true);

  // Page 4: Nouvelle construction
  setCheck('C2ZA1_nouvelle', true);
  setField('C2ZD1_description', "Installation d'une ombrière photovoltaïque...", 9.5);

  // Page 5: Puissance crête (256)
  setField('C2ZP1_crete', '256', 9.5);
  setField('C2ZE1_puissance', '256', 9.5);

  // Page 9: Signature
  setField('E1L_lieu', 'CONDOM', 9.5);
  setField('E1D_date', '25/08/2026', 9.5);
  setField('E1S_signature', 'Henri SAINT ARAILLES', 9.5);

  const outBytes = await pdfDoc.save();
  fs.writeFileSync('scratch/test_cerfa_filled_full.pdf', outBytes);
  console.log('SUCCESS: Generated scratch/test_cerfa_filled_full.pdf');
}
testFill();
