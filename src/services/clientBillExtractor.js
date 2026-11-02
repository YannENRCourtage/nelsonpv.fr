/**
 * Service d'extraction automatique des données de factures d'électricité et relevés Enedis
 * Analyse les PDF (texte natif ou OCR fallback via Tesseract) pour extraire :
 * - Consommation annuelle réelle (kWh/an)
 * - Puissance souscrite / max (kVA / kW)
 * - Numéro de PRM (14 chiffres)
 * - Titulaire du compte / contrat
 * - Adresse du site / lieu de consommation
 * - Option tarifaire (Base, HP/HC, etc.)
 */

export async function extractClientBillData(file) {
  if (!file) return null;

  let fullText = '';

  try {
    // 1. Essai d'extraction directe avec pdfjs-dist
    const pdfjs = await import('pdfjs-dist');
    if (pdfjs.GlobalWorkerOptions && !pdfjs.GlobalWorkerOptions.workerSrc) {
      pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version || '5.4.530'}/build/pdf.worker.min.mjs`;
    }

    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjs.getDocument({ data: new Uint8Array(arrayBuffer) });
    const pdf = await loadingTask.promise;

    const maxPages = Math.min(pdf.numPages, 6);
    for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map(item => item.str).join(' ');
      fullText += `\n--- Page ${pageNum} ---\n` + pageText;
    }
  } catch (pdfErr) {
    console.warn('[BillExtractor] PDF text extraction failed or encrypted:', pdfErr.message);
  }

  // 2. Si le texte extrait est trop court (ex: facture scannée en image), tentative OCR
  if (fullText.trim().length < 40) {
    try {
      console.log('[BillExtractor] Document scanné détecté — Fallback OCR Tesseract...');
      const Tesseract = await import('tesseract.js');
      const worker = await Tesseract.createWorker('fra');
      const ret = await worker.recognize(file);
      fullText = ret?.data?.text || '';
      await worker.terminate();
    } catch (ocrErr) {
      console.warn('[BillExtractor] OCR fallback failed:', ocrErr.message);
    }
  }

  return parseExtractedBillText(fullText);
}

/**
 * Moteur d'analyse regex multi-fournisseurs (EDF, Enedis, Engie, TotalEnergies, etc.)
 */
export function parseExtractedBillText(text) {
  if (!text) return null;

  const result = {
    rawText: text,
    prm: null,
    annualConsumption: null,
    peakKw: null,
    clientName: null,
    clientAddress: null,
    tariffOption: null,
  };

  const cleanText = text.replace(/[\r\t]+/g, ' ');

  // 1. Numéro PRM / Point de Livraison (14 chiffres)
  const prmRegexes = [
    /(?:PRM|PDL|Point\s+(?:de\s+)?(?:Livraison|Rfrence\s+Mesure))[\s:.\-_#Nn]*(\d{14})\b/i,
    /\b(16\d{12}|30\d{12}|50\d{12})\b/
  ];
  for (const reg of prmRegexes) {
    const match = cleanText.match(reg);
    if (match && match[1]) {
      result.prm = match[1];
      break;
    }
  }

  // 2. Consommation Annuelle / Facturée (kWh)
  const kwhRegexes = [
    /(?:consommation\s+annuelle(?:\s+de\s+rfrence)?|total\s+annuel|consommation\s+(?:totale|facture|estime)|votre\s+consommation(?:\s+annuelle)?|total\s+(?:consommations?|nergie))\s*[:=]?\s*([\d\s.,]{3,12})\s*kWh/i,
    /([\d\s.,]{3,12})\s*kWh(?:\s*\/|\s*par)?\s*an\b/i,
    /Total\s+(?:en\s+)?kWh\s*[:=]?\s*([\d\s.,]{3,10})/i
  ];

  for (const reg of kwhRegexes) {
    const match = cleanText.match(reg);
    if (match && match[1]) {
      const cleanNum = match[1].replace(/\s/g, '').replace(',', '.');
      const val = parseFloat(cleanNum);
      if (!isNaN(val) && val > 100 && val < 5000000 && val !== 5850) {
        result.annualConsumption = Math.round(val);
        break;
      }
    }
  }

  // Si HP et HC sont spécifiées séparément (ex: Heures Pleines : 3 200 kWh, Heures Creuses : 2 400 kWh)
  if (!result.annualConsumption) {
    const hpMatch = cleanText.match(/(?:heures\s+pleines|HP)\s*[:=]?\s*([\d\s.,]+)\s*kWh/i);
    const hcMatch = cleanText.match(/(?:heures\s+creuses|HC)\s*[:=]?\s*([\d\s.,]+)\s*kWh/i);
    if (hpMatch && hcMatch) {
      const hp = parseFloat(hpMatch[1].replace(/\s/g, '').replace(',', '.')) || 0;
      const hc = parseFloat(hcMatch[1].replace(/\s/g, '').replace(',', '.')) || 0;
      if (hp + hc > 200) {
        result.annualConsumption = Math.round(hp + hc);
        result.tariffOption = 'Heures Pleines / Heures Creuses';
      }
    }
  }

  // 3. Puissance souscrite / Puissance max atteinte (kVA / kW)
  const powerRegexes = [
    /(?:puissance\s+souscrite|puissance\s+max(?:imale)?(?:\s+atteinte)?|Pmax|PS)\s*[:=]?\s*(\d+(?:[.,]\d+)?)\s*(?:kVA|kW)/i,
    /(\d+(?:[.,]\d+)?)\s*kVA\b/i
  ];
  for (const reg of powerRegexes) {
    const match = cleanText.match(reg);
    if (match && match[1]) {
      const val = parseFloat(match[1].replace(',', '.'));
      if (!isNaN(val) && val >= 3 && val <= 250) {
        result.peakKw = val;
        break;
      }
    }
  }

  // 4. Titulaire (Nom ou Société)
  const titulaireRegexes = [
    /(?:Titulaire|Client|Raison\s+sociale|Nom\s+(?:et\s+prnom)?)\s*[:=]?\s*([M|Mme|Mlle|SARL|SAS|EARL|SCI|GAEC|SA\b][^\n\r,;]{3,40})/i,
    /(?:M\.|Mme|Mlle)\s+([A-Z-][A-Z-a-z-\-]+(?:\s+[A-Z-][A-Z-a-z-\-]+){1,3})/
  ];
  for (const reg of titulaireRegexes) {
    const match = cleanText.match(reg);
    if (match && match[1]) {
      const name = match[1].trim();
      if (!/enedis|facture|edf|engie|total/i.test(name)) {
        result.clientName = name;
        break;
      }
    }
  }

  // 5. Adresse du PRM (Lieu de consommation)
  const addressRegexes = [
    /(?:lieu\s+de\s+consommation|adresse\s+(?:du\s+site|de\s+desserte|d'installation))\s*[:=]?\s*([^\n\r]+)/i,
    /(\d{1,4}[^\n\r,]+(?:\d{5})\s+[A-Z-a-z-\- ]+)/
  ];
  for (const reg of addressRegexes) {
    const match = cleanText.match(reg);
    if (match && match[1]) {
      const addr = match[1].trim().replace(/\s{2,}/g, ' ');
      if (addr.length >= 8 && /\d{5}/.test(addr)) {
        result.clientAddress = addr;
        break;
      }
    }
  }

  return result;
}
