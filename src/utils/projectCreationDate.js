/**
 * Utilitaires pour extraire, verrouiller et formater la date de création
 * d'une fiche projet de manière immuable (ne doit jamais évoluer avec les
 * modifications ultérieures de la fiche).
 */

export function parseDateValue(val) {
  if (!val) return null;

  if (val instanceof Date) {
    return !isNaN(val.getTime()) && val.getFullYear() >= 2020 ? val : null;
  }

  if (typeof val === 'object') {
    if (typeof val.toDate === 'function') {
      try {
        const d = val.toDate();
        if (d instanceof Date && !isNaN(d.getTime()) && d.getFullYear() >= 2020) {
          return d;
        }
      } catch (_) {}
    }
    const secs = typeof val.seconds === 'number' ? val.seconds : (typeof val._seconds === 'number' ? val._seconds : null);
    if (secs !== null) {
      const d = new Date(secs * 1000);
      if (!isNaN(d.getTime()) && d.getFullYear() >= 2020) {
        return d;
      }
    }
    if (val.date) {
      return parseDateValue(val.date);
    }
    return null;
  }

  if (typeof val === 'number') {
    const ms = val > 1e9 && val < 1e11 ? val * 1000 : val;
    const d = new Date(ms);
    return !isNaN(d.getTime()) && d.getFullYear() >= 2020 && d.getFullYear() <= 2100 ? d : null;
  }

  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (!trimmed) return null;

    // Format français JJ/MM/AAAA
    const frMatch = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
    if (frMatch) {
      const [, dd, mm, yyyy] = frMatch;
      const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd), 12, 0, 0);
      if (!isNaN(d.getTime()) && d.getFullYear() >= 2020) {
        return d;
      }
    }

    const d = new Date(trimmed);
    return !isNaN(d.getTime()) && d.getFullYear() >= 2020 && d.getFullYear() <= 2100 ? d : null;
  }

  return null;
}

/**
 * Recherche des horodatages historiques figés dans les artefacts du projet
 * (URLs de captures, identifiants de polygones, messages chat, devis)
 * au cas où `createdAt` aurait été écrasé par un objet sentinel dans le passé.
 */
function extractHistoricalArtifactDate(p) {
  if (!p || typeof p !== 'object') return null;
  const candidates = [];

  const pushIfValid = (v) => {
    const d = parseDateValue(v);
    if (d) candidates.push(d.getTime());
  };

  // 1. ID contenant un timestamp (proj_17... ou temp_17...)
  if (typeof p.id === 'string') {
    const idMatch = p.id.match(/(?:proj|temp)_(\d{13})/);
    if (idMatch) pushIfValid(Number(idMatch[1]));
  }

  // 2. URLs de captures / photos Firebase Storage contenant un timestamp 13 chiffres
  const scanUrl = (u) => {
    if (typeof u !== 'string') return;
    const matches = u.matchAll(/(?:temp_|capture_\d+_|photo_\d+_|urb_[a-zA-Z0-9_]+_)(\d{13})/g);
    for (const m of matches) {
      pushIfValid(Number(m[1]));
    }
  };

  if (Array.isArray(p.captures)) p.captures.forEach(scanUrl);
  if (Array.isArray(p.photos)) p.photos.forEach(scanUrl);
  if (p.urbanisme_captures && typeof p.urbanisme_captures === 'object') {
    Object.values(p.urbanisme_captures).forEach(scanUrl);
  }

  // 3. Messages du chat projet
  if (Array.isArray(p.chatLines)) {
    p.chatLines.forEach((line) => {
      if (line && typeof line === 'object') {
        pushIfValid(line.timestamp || line.createdAt || line.date);
      }
    });
  }

  // 4. Polygones / symboles placés sur la carte (id = Date.now())
  if (Array.isArray(p.features)) {
    p.features.forEach((f) => {
      if (f && typeof f.id === 'number' && f.id >= 1577836800000 && f.id <= 4102444800000) {
        pushIfValid(f.id);
      }
    });
  }

  // 5. Devis associé
  if (p.lastQuote?.createdAt) pushIfValid(p.lastQuote.createdAt);
  if (Array.isArray(p.quotes)) {
    p.quotes.forEach((q) => pushIfValid(q?.createdAt || q?.date));
  }

  if (candidates.length === 0) return null;
  return new Date(Math.min(...candidates));
}

/**
 * Retourne l'objet Date correspondant à la création de la fiche projet,
 * sans utiliser `updatedAt` tant qu'une date de création ou un artefact existe.
 */
export function extractProjectCreationDate(p) {
  if (!p || typeof p !== 'object') return null;

  // 1. Champs de date de création verrouillés en priorité absolue
  const explicitFields = [
    p.dateCreation,
    p.date_creation,
    p.creationDate,
    p.createdAtIso,
    p.createdAt,
    p.created_at
  ];

  for (const field of explicitFields) {
    const parsed = parseDateValue(field);
    if (parsed) return parsed;
  }

  // 2. Artefacts historiques immuables du projet
  const artifactDate = extractHistoricalArtifactDate(p);
  if (artifactDate) return artifactDate;

  // 3. Dernier recours si le projet ancien n'avait aucun createdAt valide
  const fallback = parseDateValue(p.date || p.updatedAt || p.updated_at);
  if (fallback) return fallback;

  return null;
}

/**
 * Formate la date de création du projet au format JJ/MM/AAAA (fr-FR).
 */
export function formatProjectCreationDate(p) {
  const d = extractProjectCreationDate(p);
  if (d) {
    return d.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }
  return '—';
}
