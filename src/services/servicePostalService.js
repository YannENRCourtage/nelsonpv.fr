/**
 * ═══════════════════════════════════════════════════════════════════════════
 * SERVICE POSTAL CLIENT SERVICE
 * Service frontend pour l'envoi de courriers postaux (La Poste) via ServicePostal API
 * ═══════════════════════════════════════════════════════════════════════════
 */

/**
 * Convertit un Blob ou ArrayBuffer en chaîne Base64
 */
export async function convertBlobToBase64(blobOrBuffer) {
  if (!blobOrBuffer) return null;
  
  // Si c'est déjà un ArrayBuffer
  if (blobOrBuffer instanceof ArrayBuffer) {
    let binary = '';
    const bytes = new Uint8Array(blobOrBuffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }

  // Si c'est un Blob
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result;
      if (typeof result === 'string') {
        const base64 = result.replace(/^data:application\/pdf;base64,/, '').trim();
        resolve(base64);
      } else {
        reject(new Error('Échec conversion Base64'));
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(blobOrBuffer);
  });
}

/**
 * Extrait et normalise l'adresse destinataire depuis un objet prospect / simulation
 */
export function extractRecipientFromProspect(item) {
  if (!item) {
    return {
      nom_societe: '',
      nom: '',
      adresse_ligne1: '',
      code_postal: '',
      ville: '',
      pays: 'FRANCE'
    };
  }

  const rawCompany = (
    item.company ||
    item.nom_societe ||
    item.societe ||
    item.ownerName ||
    item.clientName ||
    (item.pacage ? `Exploitation PACAGE ${item.pacage}` : '') ||
    ''
  ).trim();

  const rawContact = (
    item.contact ||
    item.name ||
    item.nom ||
    (rawCompany ? '' : 'Direction Générale')
  ).trim();

  let street = (
    item.address ||
    item.adresse_ligne1 ||
    item.street ||
    item.adresse ||
    ''
  ).trim();

  let postalCode = (
    item.postalCode ||
    item.code_postal ||
    item.cp ||
    item.codePostal ||
    ''
  ).trim();

  let city = (
    item.cityName ||
    item.city ||
    item.ville ||
    item.commune ||
    ''
  ).trim();

  // Extraction automatique si l'adresse complète contient le code postal
  if (!postalCode || !city) {
    const cpMatch = street.match(/\b(\d{5})\b\s*(.*)$/);
    if (cpMatch) {
      if (!postalCode) postalCode = cpMatch[1];
      if (!city && cpMatch[2]) city = cpMatch[2].replace(/[,\.]/g, '').trim();
      street = street.replace(cpMatch[0], '').replace(/[,\s]+$/, '').trim();
    }
  }

  // Fallback département si code postal manquant
  if (!postalCode && item.departmentCode) {
    postalCode = `${item.departmentCode}000`;
  }

  return {
    nom_societe: rawCompany,
    nom: rawContact,
    adresse_ligne1: street,
    code_postal: postalCode,
    ville: city.toUpperCase(),
    pays: 'FRANCE'
  };
}

/**
 * Envoie une lettre postale via l'endpoint serverless Vercel /api/servicepostal/send
 * @param {Object} params
 * @param {Blob|ArrayBuffer|string} params.pdfSource - Blob, ArrayBuffer ou string Base64
 * @param {Object} params.recipient - Objet { nom_societe, nom, adresse_ligne1, code_postal, ville, pays }
 * @param {Object} [params.options] - Options d'affranchissement, couleur, preview, etc.
 */
export async function sendPostalLetter({ pdfSource, recipient, options = {} }) {
  if (!pdfSource) {
    throw new Error('Aucun fichier PDF fourni pour l\'envoi postal.');
  }

  let pdfBase64 = '';
  if (typeof pdfSource === 'string') {
    pdfBase64 = pdfSource.replace(/^data:application\/pdf;base64,/, '').trim();
  } else {
    pdfBase64 = await convertBlobToBase64(pdfSource);
  }

  const response = await fetch('/api/servicepostal/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      pdfBase64,
      recipient,
      options: {
        affranchissement: options.affranchissement || 'verte',
        couleur: options.couleur || 'couleur',
        recto_verso: options.recto_verso || 'rectoverso',
        preview: Boolean(options.preview),
        reference: options.reference || undefined
      }
    })
  });

  const data = await response.json();

  if (!response.ok) {
    const err = new Error(data.error || `Erreur envoi postal (${response.status})`);
    err.status = response.status;
    err.errorCode = data.errorCode;
    err.details = data.details;
    throw err;
  }

  return data;
}

/**
 * Consulte le statut de suivi d'un courrier envoyé
 * @param {string} uid - Identifiant unique ServicePostal
 */
export async function getPostalLetterStatus(uid) {
  if (!uid) throw new Error('UID requis pour consulter le statut postal.');

  const res = await fetch(`/api/servicepostal/status?uid=${encodeURIComponent(uid)}`);
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || `Erreur statut postal (${res.status})`);
  }

  return data;
}
