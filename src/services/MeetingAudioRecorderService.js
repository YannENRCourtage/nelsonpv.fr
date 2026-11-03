import { jsPDF } from 'jspdf';

const DB_NAME = 'nelson_meetingly_db';
const DB_VERSION = 1;
const STORE_NAME = 'meetings';

/**
 * Ouvre la base IndexedDB dédiée aux enregistrements audio et comptes-rendus Meetingly IA
 */
function openMeetingDB() {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB non supporté sur ce navigateur.'));
      return;
    }
    const req = window.indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('createdAt', 'createdAt', { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveMeetingToIndexedDB(meetingRecord) {
  const db = await openMeetingDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put(meetingRecord);
    tx.oncomplete = () => resolve(meetingRecord);
    tx.onerror = () => reject(tx.error);
  });
}

export async function getAllMeetingsFromIndexedDB() {
  try {
    const db = await openMeetingDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => {
        const list = Array.isArray(req.result) ? req.result : [];
        list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        resolve(list);
      };
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('[Meetingly] IndexedDB lecture impossible:', err);
    return [];
  }
}

export async function deleteMeetingFromIndexedDB(id) {
  const db = await openMeetingDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.delete(id);
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Formate un nombre de secondes en HH:MM:SS
 */
export function formatDurationHms(totalSeconds = 0) {
  const sec = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return [h, m, s].map((v) => String(v).padStart(2, '0')).join(':');
}

/**
 * Nettoie un nom pour un fichier téléchargeable
 */
export function sanitizeFileToken(str = 'Client') {
  return (
    String(str || 'Client')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9_-]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 48) || 'Client'
  );
}

/**
 * Service d'enregistrement Audio Multipiste (Téléphone / Salle & Microsoft Teams / Meet / Zoom)
 * Mixe le flux microphone et le flux audio système sur une piste unique via Web Audio API.
 */
export class MeetingAudioRecorderService {
  constructor() {
    this.audioContext = null;
    this.micStream = null;
    this.displayStream = null;
    this.destinationNode = null;
    this.analyserNode = null;
    this.mediaRecorder = null;
    this.chunks = [];
    this.mode = 'phone'; // 'phone' | 'teams'
    this.mimeType = 'audio/webm';
    this.hasSystemAudio = false;
    this.onStopCallback = null;
    this.onErrorCallback = null;
  }

  getBestMimeType() {
    if (typeof MediaRecorder === 'undefined') return '';
    const candidates = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/mp4',
    ];
    for (const type of candidates) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }
    return '';
  }

  /**
   * Démarre l'enregistrement selon le mode choisi :
   * - 'phone' : Appel téléphonique / Micro salle (echoCancellation: false pour capter le haut-parleur du téléphone)
   * - 'teams' : Réunion Microsoft Teams / Google Meet / Zoom (Mixage Micro + Son Système via AudioContext)
   */
  async start(mode = 'phone') {
    this.cleanup();
    this.mode = mode;
    this.chunks = [];
    this.hasSystemAudio = false;

    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    this.audioContext = new AudioCtx();
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    this.destinationNode = this.audioContext.createMediaStreamDestination();
    this.analyserNode = this.audioContext.createAnalyser();
    this.analyserNode.fftSize = 256;
    this.analyserNode.smoothingTimeConstant = 0.8;

    // 1. Capture du flux microphone
    this.micStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: mode === 'phone' ? false : true,
        noiseSuppression: true,
        autoGainControl: true,
      },
      video: false,
    });

    const micSource = this.audioContext.createMediaStreamSource(this.micStream);
    const micGain = this.audioContext.createGain();
    micGain.gain.value = 1.0;
    micSource.connect(micGain);
    micGain.connect(this.destinationNode);
    micGain.connect(this.analyserNode);

    // 2. Si Mode Teams / Visio : capture du flux audio système/onglet et mixage
    let systemAudioWarning = null;
    if (mode === 'teams') {
      try {
        this.displayStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: {
            suppressLocalAudioPlayback: false,
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
          },
        });

        const sysAudioTracks = this.displayStream.getAudioTracks();
        if (sysAudioTracks.length > 0) {
          this.hasSystemAudio = true;
          const sysAudioOnlyStream = new MediaStream(sysAudioTracks);
          const sysSource = this.audioContext.createMediaStreamSource(sysAudioOnlyStream);
          const sysGain = this.audioContext.createGain();
          sysGain.gain.value = 1.05;
          sysSource.connect(sysGain);
          sysGain.connect(this.destinationNode);
          sysGain.connect(this.analyserNode);
        } else {
          systemAudioWarning =
            "Attention : aucune piste audio système n'a été détectée dans le partage d'écran. Pensez à cocher « Partager l'audio de l'onglet / du système » dans la fenêtre du navigateur pour enregistrer la voix de vos interlocuteurs Teams/Meet. Le microphone reste enregistré.";
        }

        // Arrêter proprement la piste vidéo inutile tout en maintenant l'audio système actif
        const videoTracks = this.displayStream.getVideoTracks();
        videoTracks.forEach((vTrack) => {
          try {
            vTrack.stop();
          } catch (_) {}
        });
      } catch (err) {
        this.cleanup();
        throw new Error(
          "Le partage d'audio Teams/Meet a été annulé ou refusé. Sélectionnez la fenêtre ou l'onglet de votre réunion et cochez « Partager l'audio »."
        );
      }
    }

    // 3. Instanciation du MediaRecorder sur le flux mixé
    const bestMime = this.getBestMimeType();
    this.mimeType = bestMime || 'audio/webm';
    const recorderOptions = bestMime ? { mimeType: bestMime, audioBitsPerSecond: 128000 } : {};

    this.mediaRecorder = new MediaRecorder(this.destinationNode.stream, recorderOptions);

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        this.chunks.push(event.data);
      }
    };

    this.mediaRecorder.onerror = (event) => {
      if (this.onErrorCallback) {
        this.onErrorCallback(event.error || new Error("Erreur MediaRecorder pendant l'enregistrement."));
      }
    };

    this.mediaRecorder.start(1000); // Collecte des chunks chaque seconde

    return {
      mode: this.mode,
      hasSystemAudio: this.hasSystemAudio,
      systemAudioWarning,
      analyser: this.analyserNode,
    };
  }

  pause() {
    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      this.mediaRecorder.pause();
      return true;
    }
    return false;
  }

  resume() {
    if (this.mediaRecorder && this.mediaRecorder.state === 'paused') {
      this.mediaRecorder.resume();
      return true;
    }
    return false;
  }

  stop() {
    return new Promise((resolve) => {
      if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
        const blob = new Blob(this.chunks, { type: this.mimeType || 'audio/webm' });
        this.cleanup();
        resolve({ blob, mimeType: this.mimeType || 'audio/webm' });
        return;
      }

      this.mediaRecorder.onstop = () => {
        const blob = new Blob(this.chunks, { type: this.mimeType || 'audio/webm' });
        const finalMime = this.mimeType || 'audio/webm';
        this.cleanup();
        resolve({ blob, mimeType: finalMime });
      };

      try {
        this.mediaRecorder.stop();
      } catch (_) {
        const blob = new Blob(this.chunks, { type: this.mimeType || 'audio/webm' });
        this.cleanup();
        resolve({ blob, mimeType: this.mimeType || 'audio/webm' });
      }
    });
  }

  cleanup() {
    if (this.micStream) {
      this.micStream.getTracks().forEach((t) => {
        try {
          t.stop();
        } catch (_) {}
      });
      this.micStream = null;
    }
    if (this.displayStream) {
      this.displayStream.getTracks().forEach((t) => {
        try {
          t.stop();
        } catch (_) {}
      });
      this.displayStream = null;
    }
    if (this.audioContext) {
      try {
        if (this.audioContext.state !== 'closed') {
          this.audioContext.close();
        }
      } catch (_) {}
      this.audioContext = null;
    }
    this.destinationNode = null;
    this.analyserNode = null;
    this.mediaRecorder = null;
  }
}

/**
 * Analyse intelligente de la transcription + notes rapides + dossier rattaché
 * pour pré-remplir les 6 sections éditables du compte-rendu
 */
export function buildStructuredMeetingReport({
  transcriptEntries = [],
  quickNotes = [],
  meta = {},
  linkedRow = null,
}) {
  const fullText = [
    ...transcriptEntries.map((t) => t.text || ''),
    ...quickNotes.map((n) => n.text || ''),
  ]
    .join(' ')
    .trim();

  const rowData = linkedRow?.data || {};
  const clientLabel =
    meta.clientName ||
    linkedRow?.title ||
    rowData['NOM'] ||
    rowData['Nom'] ||
    rowData['Client'] ||
    rowData['Projet'] ||
    'Client / Prospect';

  const channelLabel =
    meta.mode === 'teams'
      ? 'Visioconférence Microsoft Teams / Meet'
      : meta.mode === 'import'
      ? 'Enregistrement Audio Importé'
      : 'Appel Téléphonique';

  // Extraction intelligente de mots-clés techniques, financiers et réglementaires
  const detectedPoints = [];

  // 1. Puissances (kW, kWc, MW, MWh, kWh)
  const powerMatches = fullText.match(/\b\d+(?:[.,]\d+)?\s*(?:kW|kWc|MW|MWh|kWh|m²|m2)\b/gi);
  if (powerMatches && powerMatches.length > 0) {
    const uniqPowers = Array.from(new Set(powerMatches.map((m) => m.trim())));
    detectedPoints.push(
      `Dimensionnement & puissances évoqués : ${uniqPowers.join(', ')}.`
    );
  }

  // 2. Solutions matérielles (BESS, SAFRA, CESC, Solaime, BatiTech, Barconnière, Ombrière)
  if (/batterie|bess|safra|cesc|stockage|mercury/i.test(fullText)) {
    detectedPoints.push(
      `Solution Stockage BESS : Étude d'implantation Station Batteries Stand-Alone (emprise < 20 m², armoires CESC / SAFRA, raccordement réseau et sécurisation SDIS).`
    );
  }
  if (/solaime|tracker|suiveur/i.test(fullText)) {
    detectedPoints.push(
      `Solution Photovoltaïque Solaime : Présentation des caractéristiques de production et d'intégration sur site.`
    );
  }
  if (/batitech|s[eé]choir|hangar|b[aâ]timent/i.test(fullText)) {
    detectedPoints.push(
      `Bâtiment / Séchoir Solaire (BatiTech / Charpente) : Validation du gabarit de toiture photovoltaïque et des usages agricoles ou industriels.`
    );
  }
  if (/ombri[eè]re|barconni[eè]re|parking/i.test(fullText)) {
    detectedPoints.push(
      `Ombrière Photovoltaïque (Barconnière) : Étude de couverture parking / aire de stockage et dimensionnement structurel.`
    );
  }

  // 3. Raccordement Enedis / PRM / HTA / BT
  const prmMatch = fullText.match(/\b\d{14}\b/);
  if (prmMatch || /enedis|prm|pdl|raccordement|hta|bt|transfo|mandat/i.test(fullText)) {
    detectedPoints.push(
      `Raccordement Enedis & Réseau : ${
        prmMatch ? `PRM identifié n° ${prmMatch[0]} — ` : ''
      }Analyse de la proximité du poste de transformation HTA/BT, du point de livraison (PDL) et du mandat de collecte des courbes de charge.`
    );
  }

  // 4. Urbanisme (DP, PC, Cadastre, Mairie, Délais)
  if (/urbanisme|d[eé]claration pr[eé]alable|\bdp\b|permis|\bpc\b|mairie|cadastre|parcelle|plu/i.test(fullText)) {
    detectedPoints.push(
      `Urbanisme & Instruction Administrative : Préparation du dossier réglementaire (Déclaration Préalable DP / Permis de Construire PC, insertion paysagère DP6 et vérification cadastrale).`
    );
  }

  // 5. Éléments financiers (tarif, bail, loyer, budget, investissement, rentabilité)
  if (/tarif|prix|budget|loyer|bail|financement|rentabilit[eé]|euro|€|devis|offre/i.test(fullText)) {
    detectedPoints.push(
      `Conditions Financières & Contractuelles : Revue des conditions économiques, du modèle de valorisation énergétique et des modalités contractuelles avec le client.`
    );
  }

  // Ajouter les notes rapides saisies manuellement en tant que points clés prioritaires
  quickNotes.forEach((n) => {
    if (n.text && n.text.trim()) {
      detectedPoints.push(`[Note à ${n.timestamp || '00:00:00'}] ${n.text.trim()}`);
    }
  });

  // Données issues de la ligne Monday si rattachée
  if (linkedRow && linkedRow.data) {
    const infoParts = [];
    Object.entries(linkedRow.data).forEach(([k, v]) => {
      if (
        !k.startsWith('__') &&
        v !== null &&
        v !== undefined &&
        String(v).trim() !== '' &&
        String(v).length < 80
      ) {
        infoParts.push(`${k} : ${String(v).trim()}`);
      }
    });
    if (infoParts.length > 0) {
      detectedPoints.push(
        `Données dossier Monday (${linkedRow.tableName || 'Tableau'}) : ${infoParts.slice(0, 5).join(' • ')}.`
      );
    }
  }

  if (detectedPoints.length === 0) {
    detectedPoints.push(
      `Présentation globale de l'accompagnement ENR COURTAGE (audit énergétique, dimensionnement photovoltaïque / stockage BESS et démarches administratives).`,
      `Vérification des coordonnées du site d'implantation, des références cadastrales et de la capacité de raccordement Enedis (PDL / Transformateur HTA).`,
      `Calibrage du calendrier prévisionnel d'instruction urbanisme (DP / PC) et des prochaines étapes techniques.`
    );
  }

  // Synthèse exécutive automatique
  let executiveSummary = '';
  if (fullText.length > 40) {
    const cleanSentences = fullText
      .replace(/\s+/g, ' ')
      .split(/(?<=[.!?])\s+/)
      .filter((s) => s.trim().length > 15);
    const excerpt = cleanSentences.slice(0, 3).join(' ');
    executiveSummary = `Échange réalisé en mode ${channelLabel.toLowerCase()} concernant le dossier « ${clientLabel} ». Principaux éléments abordés : ${
      excerpt || fullText.slice(0, 260)
    }. Les paramètres techniques, administratifs et le plan d'action associé ont été structurés ci-dessous pour suivi dans Monday.`;
  } else {
    executiveSummary = `Point d'avancement réalisé en mode ${channelLabel.toLowerCase()} pour le dossier « ${clientLabel} ». L'échange a permis de faire le point sur la faisabilité technique et réglementaire du projet (dimensionnement énergétique, raccordement Enedis et autorisations d'urbanisme) et de définir les prochaines actions entre ENR COURTAGE et l'interlocuteur.`;
  }

  // Décisions actées
  const decisions = [
    `Validation de l'intérêt du client (${clientLabel}) pour la poursuite de l'étude technique et administrative avec ENR COURTAGE.`,
    `Accord pour la collecte des pièces nécessaires au dossier (mandat Enedis / relevé cadastral / validation de l'implantation).`,
    `Planification d'un point de suivi après consolidation des éléments d'ingénierie et d'urbanisme.`,
  ];

  // Plan d'action par défaut (To-Do List)
  const today = new Date();
  const in3Days = new Date(today.getTime() + 3 * 86400000).toLocaleDateString('fr-FR');
  const in7Days = new Date(today.getTime() + 7 * 86400000).toLocaleDateString('fr-FR');
  const in14Days = new Date(today.getTime() + 14 * 86400000).toLocaleDateString('fr-FR');

  const actionPlan = [
    {
      id: 'act-1',
      action: `Vérifier les données techniques du site (PRM Enedis, distance PDL / Transfo, parcelle cadastrale) pour ${clientLabel}`,
      owner: 'ENR Courtage',
      dueDate: in3Days,
    },
    {
      id: 'act-2',
      action: `Transmettre les documents requis (Mandat signé / justificatifs / validation d'implantation)`,
      owner: 'Client',
      dueDate: in7Days,
    },
    {
      id: 'act-3',
      action: `Finaliser l'étude de dimensionnement ou le dossier d'urbanisme (DP / PC) et présenter la synthèse`,
      owner: 'ENR Courtage',
      dueDate: in14Days,
    },
  ];

  return {
    title: meta.title || `Réunion & Suivi Projet — ${clientLabel}`,
    dateTime: meta.dateTime || new Date().toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }),
    duration: meta.duration || '00:00:00',
    channel: channelLabel,
    participants: meta.participants || `Yann BARBERIS (ENR Courtage), ${clientLabel}`,
    statusPriority: meta.statusPriority || 'Haute Priorité • En cours',
    linkedTableId: linkedRow?.tableId || meta.linkedTableId || '',
    linkedTableName: linkedRow?.tableName || meta.linkedTableName || '',
    linkedRowId: linkedRow?.rowId || meta.linkedRowId || '',
    linkedRowTitle: linkedRow?.title || meta.linkedRowTitle || clientLabel,
    executiveSummary,
    keyPointsText: detectedPoints.map((p) => `• ${p}`).join('\n'),
    decisionsText: decisions.map((d) => `• ${d}`).join('\n'),
    actionPlan,
    includeTranscriptInPdf: meta.includeTranscriptInPdf !== undefined ? meta.includeTranscriptInPdf : true,
  };
}

/**
 * Génère et télécharge le PDF officiel A4 Portrait "COMPTE-RENDU DE RÉUNION — ENR COURTAGE"
 */
export function exportMeetingReportToPDF(reportData, transcriptEntries = []) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = 210;
  const pageH = 297;
  const marginX = 12;
  const contentW = pageW - marginX * 2; // 186 mm
  const bottomLimit = pageH - 18;

  let curY = 10;

  const ensureSpace = (neededMm = 20) => {
    if (curY + neededMm > bottomLimit) {
      doc.addPage();
      curY = 14;
    }
  };

  const isTeams = String(reportData.channel || '').toLowerCase().includes('teams') ||
                  String(reportData.channel || '').toLowerCase().includes('visio');
  const badgeLabel = isTeams
    ? 'COMPTE-RENDU DE RÉUNION TEAMS / VISIO'
    : "COMPTE-RENDU D'APPEL TÉLÉPHONIQUE";

  // ── 1. EN-TÊTE INSTITUTIONNEL ENR COURTAGE ────────────────────────────────
  doc.setFillColor(15, 23, 42); // Slate 900
  doc.roundedRect(marginX, curY, contentW, 24, 2.5, 2.5, 'F');

  // Carré logo ENR
  doc.setFillColor(37, 99, 235); // Blue 600
  doc.roundedRect(marginX + 4, curY + 4, 16, 16, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('ENR', marginX + 12, curY + 11.2, { align: 'center' });
  doc.setFontSize(6.5);
  doc.text('COURTAGE', marginX + 12, curY + 16, { align: 'center' });

  // Titre & Coordonnées société
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(
    "ENR COURTAGE — Ingénierie, Photovoltaïque & Stockage d'Énergie BESS",
    marginX + 24,
    curY + 9
  );

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(203, 213, 225);
  doc.text(
    '7 Rue Gutenberg, 33700 Mérignac • contact@enr-courtage.fr',
    marginX + 24,
    curY + 14.2
  );

  // Titre de la réunion sous l'adresse
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(147, 197, 253);
  const cleanTitle = String(reportData.title || 'Compte-Rendu de Réunion').slice(0, 72);
  doc.text(`Objet : ${cleanTitle}`, marginX + 24, curY + 20);

  // Badge Type de réunion en haut à droite
  const badgeW = 62;
  doc.setFillColor(isTeams ? 79 : 16, isTeams ? 70 : 185, isTeams ? 229 : 129);
  doc.roundedRect(marginX + contentW - badgeW - 4, curY + 4, badgeW, 7, 1.5, 1.5, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.8);
  doc.text(badgeLabel, marginX + contentW - badgeW / 2 - 4, curY + 8.6, { align: 'center' });

  // Réf & Date sous le badge
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(226, 232, 240);
  doc.text(
    `Date : ${reportData.dateTime || new Date().toLocaleDateString('fr-FR')}`,
    marginX + contentW - 4,
    curY + 15.5,
    { align: 'right' }
  );
  const refStr = reportData.linkedRowTitle
    ? `Dossier : ${String(reportData.linkedRowTitle).slice(0, 28)}`
    : 'Réf : ENR-CR';
  doc.text(refStr, marginX + contentW - 4, curY + 20, { align: 'right' });

  curY += 28;

  // ── 2. CARTOUCHE RÉCAPITULATIF (4 COLONNES) ───────────────────────────────
  const cartH = 18;
  doc.setFillColor(241, 245, 249); // #f1f5f9
  doc.setDrawColor(203, 213, 225); // #cbd5e1
  doc.setLineWidth(0.35);
  doc.roundedRect(marginX, curY, contentW, cartH, 2, 2, 'FD');

  const colW = contentW / 4;
  const colsMeta = [
    {
      label: 'CLIENT / PROJET RATTACHÉ',
      val: String(reportData.linkedRowTitle || reportData.title || 'Non rattaché'),
    },
    {
      label: 'INTERLOCUTEURS',
      val: String(reportData.participants || 'ENR Courtage & Client'),
    },
    {
      label: 'DATE, CANAL & DURÉE',
      val: `${reportData.dateTime || ''} (${reportData.duration || '00:00:00'})`,
    },
    {
      label: 'STATUT / PRIORITÉ',
      val: String(reportData.statusPriority || 'Suivi Actif'),
    },
  ];

  colsMeta.forEach((c, idx) => {
    const cx = marginX + idx * colW;
    if (idx > 0) {
      doc.setDrawColor(203, 213, 225);
      doc.line(cx, curY + 2, cx, curY + cartH - 2);
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text(c.label, cx + 3, curY + 5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    const wrappedVal = doc.splitTextToSize(c.val, colW - 6);
    doc.text(wrappedVal.slice(0, 2), cx + 3, curY + 10.2);
  });

  curY += cartH + 5;

  // ── 3. BLOC 1 — SYNTHÈSE EXÉCUTIVE (Bordure latérale bleue #2563eb) ────────
  const summaryText = String(reportData.executiveSummary || 'Aucune synthèse renseignée.').trim();
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  const summaryLines = doc.splitTextToSize(summaryText, contentW - 10);
  const summaryBoxH = Math.max(20, summaryLines.length * 4.4 + 11);

  ensureSpace(summaryBoxH + 4);

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(219, 234, 254);
  doc.setLineWidth(0.3);
  doc.roundedRect(marginX, curY, contentW, summaryBoxH, 2, 2, 'FD');

  // Barre latérale bleue #2563eb
  doc.setFillColor(37, 99, 235);
  doc.roundedRect(marginX, curY, 2.5, summaryBoxH, 1, 1, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(30, 64, 175);
  doc.text('1. SYNTHÈSE EXÉCUTIVE (EXECUTIVE SUMMARY)', marginX + 6, curY + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.8);
  doc.setTextColor(30, 41, 59);
  doc.text(summaryLines, marginX + 6, curY + 11.8);

  curY += summaryBoxH + 5;

  // ── 4. BLOC 2 — POINTS TECHNIQUES, FINANCIERS & RÉGLEMENTAIRES ABORDÉS ────
  const rawPoints = String(reportData.keyPointsText || '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.8);
  const allPointLines = [];
  rawPoints.forEach((pt) => {
    const cleanPt = pt.startsWith('•') || pt.startsWith('-') ? pt : `• ${pt}`;
    const wrapped = doc.splitTextToSize(cleanPt, contentW - 10);
    allPointLines.push(wrapped);
  });

  const totalPointLineCount = allPointLines.reduce((acc, arr) => acc + arr.length, 0);
  const pointsBoxH = Math.max(22, totalPointLineCount * 4.3 + allPointLines.length * 1.4 + 12);

  ensureSpace(pointsBoxH + 4);

  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.35);
  doc.roundedRect(marginX, curY, contentW, pointsBoxH, 2, 2, 'FD');

  // Bandeau titre Bloc 2
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(marginX, curY, contentW, 7.5, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.8);
  doc.setTextColor(15, 23, 42);
  doc.text(
    '2. POINTS TECHNIQUES, FINANCIERS & RÉGLEMENTAIRES ABORDÉS',
    marginX + 4,
    curY + 5.2
  );

  let ptY = curY + 12.5;
  allPointLines.forEach((linesArr) => {
    linesArr.forEach((lineStr, lIdx) => {
      // Mettre en évidence le début du point (avant ":") s'il y en a un
      if (lIdx === 0 && lineStr.includes(':')) {
        const colonIdx = lineStr.indexOf(':');
        const prefix = lineStr.slice(0, colonIdx + 1);
        const rest = lineStr.slice(colonIdx + 1);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42);
        doc.text(prefix, marginX + 5, ptY);
        const prefixW = doc.getTextWidth(prefix);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(51, 65, 85);
        doc.text(rest, marginX + 5 + prefixW, ptY);
      } else {
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(51, 65, 85);
        doc.text(lineStr, marginX + 5, ptY);
      }
      ptY += 4.3;
    });
    ptY += 1.4;
  });

  curY += pointsBoxH + 5;

  // ── 5. BLOC 3 — DÉCISIONS VALIDÉES EN SÉANCE (Encadré vert émeraude #10b981)
  const rawDecisions = String(reportData.decisionsText || '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.8);
  const decisionWrapped = [];
  rawDecisions.forEach((d) => {
    const cleanD = d.startsWith('•') || d.startsWith('-') ? d : `• ${d}`;
    decisionWrapped.push(...doc.splitTextToSize(cleanD, contentW - 12));
  });

  const decBoxH = Math.max(20, decisionWrapped.length * 4.4 + 12);
  ensureSpace(decBoxH + 4);

  doc.setFillColor(236, 253, 245); // Emerald 50
  doc.setDrawColor(16, 185, 129); // Emerald 500 (#10b981)
  doc.setLineWidth(0.4);
  doc.roundedRect(marginX, curY, contentW, decBoxH, 2, 2, 'FD');

  doc.setFillColor(16, 185, 129);
  doc.roundedRect(marginX, curY, 2.5, decBoxH, 1, 1, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(6, 95, 70);
  doc.text('3. DÉCISIONS VALIDÉES EN SÉANCE & ACCORDS', marginX + 6, curY + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.8);
  doc.setTextColor(6, 78, 59);
  doc.text(decisionWrapped, marginX + 6, curY + 11.8);

  curY += decBoxH + 5;

  // ── 6. BLOC 4 — PLAN D'ACTION & ÉCHÉANCIER (TO-DO LIST 3 COLONNES) ─────────
  const actions = Array.isArray(reportData.actionPlan) ? reportData.actionPlan : [];
  ensureSpace(32);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text("4. PLAN D'ACTION & ÉCHÉANCIER (PROCHAINES ÉTAPES)", marginX, curY + 4.5);
  curY += 6.5;

  // En-tête du tableau 3 colonnes
  const c1W = 114;
  const c2W = 42;
  const c3W = contentW - c1W - c2W; // 30 mm

  doc.setFillColor(30, 41, 59);
  doc.rect(marginX, curY, contentW, 7, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('TÂCHE / ACTION À RÉALISER', marginX + 3, curY + 4.8);
  doc.text('RESPONSABLE', marginX + c1W + 3, curY + 4.8);
  doc.text('DATE CIBLE', marginX + c1W + c2W + 3, curY + 4.8);
  curY += 7;

  actions.forEach((item, idx) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.3);
    const taskLines = doc.splitTextToSize(String(item.action || '—'), c1W - 6);
    const rowH = Math.max(7.5, taskLines.length * 4.2 + 3);

    ensureSpace(rowH + 2);

    doc.setFillColor(idx % 2 === 0 ? 248 : 255, idx % 2 === 0 ? 250 : 255, idx % 2 === 0 ? 252 : 255);
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.25);
    doc.rect(marginX, curY, contentW, rowH, 'FD');

    doc.line(marginX + c1W, curY, marginX + c1W, curY + rowH);
    doc.line(marginX + c1W + c2W, curY, marginX + c1W + c2W, curY + rowH);

    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'normal');
    doc.text(taskLines, marginX + 3, curY + 4.8);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(37, 99, 235);
    doc.text(String(item.owner || 'ENR Courtage').slice(0, 24), marginX + c1W + 3, curY + 4.8);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text(String(item.dueDate || 'À définir').slice(0, 16), marginX + c1W + c2W + 3, curY + 4.8);

    curY += rowH;
  });

  curY += 6;

  // ── 7. ANNEXE OPTIONNELLE — TRANSCRIPTION CHRONOLOGIQUE HORODATÉE ─────────
  if (reportData.includeTranscriptInPdf && transcriptEntries.length > 0) {
    ensureSpace(24);

    doc.setFillColor(241, 245, 249);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(marginX, curY, contentW, 7.5, 1.5, 1.5, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(30, 41, 59);
    doc.text(
      `ANNEXE — TRANSCRIPTION CHRONOLOGIQUE HORODATÉE (${transcriptEntries.length} INTERVENTIONS)`,
      marginX + 3.5,
      curY + 5.1
    );
    curY += 10;

    transcriptEntries.forEach((entry) => {
      const prefix = `[${entry.timestamp || '00:00:00'}] ${entry.speaker || 'Intervenant'} : `;
      const body = String(entry.text || '').trim();
      if (!body) return;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      const wrapped = doc.splitTextToSize(`${prefix}${body}`, contentW - 4);
      const blockH = wrapped.length * 3.9 + 1.8;

      ensureSpace(blockH + 2);

      doc.setTextColor(51, 65, 85);
      doc.text(wrapped, marginX + 2, curY + 3.2);
      curY += blockH;
    });
  }

  // ── 8. PIED DE PAGE NUMÉROTÉ SUR TOUTES LES PAGES ──────────────────────────
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(marginX, pageH - 12, pageW - marginX, pageH - 12);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(
      'ENR COURTAGE SAS — 7 Rue Gutenberg, 33700 Mérignac • Compte-rendu confidentiel',
      marginX,
      pageH - 7.5
    );
    doc.setFont('helvetica', 'bold');
    doc.text(`Page ${p} / ${totalPages}`, pageW - marginX, pageH - 7.5, { align: 'right' });
  }

  const dateIso = new Date().toISOString().slice(0, 10);
  const clientToken = sanitizeFileToken(reportData.linkedRowTitle || reportData.title || 'Client');
  const fileName = `Compte_Rendu_${clientToken}_${dateIso}.pdf`;
  doc.save(fileName);
  return fileName;
}

/**
 * Extrait le texte lisible d'un fichier importé (.txt, .eml, .csv, .md, .json, .docx, .xlsx, .pdf)
 * afin d'alimenter le contexte de l'IA NELSON avant ou pendant la conversation.
 */
export async function extractTextFromUploadedFile(file) {
  if (!file) return '';
  const name = (file.name || '').toLowerCase();

  try {
    // 1. Fichiers texte brut, mails (.eml), CSV, Markdown, JSON
    if (
      name.endsWith('.txt') ||
      name.endsWith('.eml') ||
      name.endsWith('.csv') ||
      name.endsWith('.md') ||
      name.endsWith('.json') ||
      name.endsWith('.html') ||
      file.type.startsWith('text/')
    ) {
      const raw = await file.text();
      return raw.slice(0, 25000);
    }

    // 2. Fichiers Word (.docx) via JSZip
    if (name.endsWith('.docx')) {
      const JSZip = (await import('jszip')).default;
      const buf = await file.arrayBuffer();
      const zip = await JSZip.loadAsync(buf);
      const docXml = zip.file('word/document.xml');
      if (docXml) {
        const xmlStr = await docXml.async('string');
        const cleaned = xmlStr
          .replace(/<\/w:p>/g, '\n')
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
        return cleaned.slice(0, 25000);
      }
    }

    // 3. Fichiers Excel (.xlsx / .xls)
    if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
      const XLSX = await import('xlsx');
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array' });
      const lines = [];
      wb.SheetNames.slice(0, 4).forEach((sheetName) => {
        const sheet = wb.Sheets[sheetName];
        const csv = XLSX.utils.sheet_to_csv(sheet);
        if (csv && csv.trim()) {
          lines.push(`[Feuille ${sheetName}]\n${csv.trim()}`);
        }
      });
      return lines.join('\n\n').slice(0, 25000);
    }

    // 4. Fichiers PDF : extraction des chaînes lisibles ou métadonnées
    if (name.endsWith('.pdf') || file.type === 'application/pdf') {
      const buf = await file.arrayBuffer();
      const bytes = new Uint8Array(buf);
      const decoder = new TextDecoder('latin1');
      const rawPdf = decoder.decode(bytes);
      const textChunks = [];
      const regex = /\(([^()\\]{3,200})\)/g;
      let m;
      while ((m = regex.exec(rawPdf)) !== null) {
        const s = m[1].replace(/[^\x20-\x7EÀ-ÿ]/g, ' ').trim();
        if (s.length > 3 && /[a-zA-ZÀ-ÿ]{2,}/.test(s)) {
          textChunks.push(s);
        }
        if (textChunks.length > 600) break;
      }
      if (textChunks.length > 5) {
        return textChunks.join(' ').slice(0, 25000);
      }
      return `Document PDF joint : ${file.name} (${(file.size / 1024).toFixed(1)} Ko).`;
    }
  } catch (err) {
    console.warn('[Meetingly] Extraction texte fichier:', err);
  }

  return `Document fourni : ${file.name} (${(file.size / 1024).toFixed(1)} Ko).`;
}

/**
 * Copilote IA NELSON en direct : répond aux questions de l'utilisateur en croisant :
 * - les interlocuteurs (Nom, Entreprise, Poste),
 * - la retranscription en direct de la conversation,
 * - les mails / textes collés et les documents chargés avant ou pendant l'appel.
 */
export async function askNelsonMeetingAI({
  question,
  participants = [],
  transcriptEntries = [],
  contextText = '',
  uploadedDocs = [],
  linkedRow = null,
}) {
  const q = String(question || '').trim();
  if (!q) return '';

  const speaker1 = participants[0] || { name: 'Yann', company: 'ENR COURTAGE', role: 'Dirigeant' };
  const otherSpeakers = participants.slice(1).filter((p) => p.name || p.company);
  const interlocutorsSummary = participants
    .filter((p) => p.name || p.company)
    .map((p) => `${p.name || 'Interlocuteur'}${p.company ? ` (${p.company}${p.role ? ` - ${p.role}` : ''})` : ''}`)
    .join(', ');

  const transcriptFull = transcriptEntries
    .map((t) => `[${t.timestamp || '00:00'}] ${t.speaker}: ${t.text}`)
    .join('\n');

  const docsFull = uploadedDocs
    .map((d) => `[Document: ${d.name}]\n${d.extractedText || ''}`)
    .join('\n\n');

  const combinedKnowledge = [contextText, docsFull, transcriptFull].filter(Boolean).join('\n\n');

  // 1. Tentative d'appel Gemini API si clé configurée dans l'environnement Vite
  const geminiKey =
    typeof import.meta !== 'undefined' && import.meta.env
      ? import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.VITE_GOOGLE_AI_KEY
      : null;

  if (geminiKey) {
    try {
      const systemPrompt = [
        `Tu es l'IA Copilote de réunion de la plateforme NELSON pour ${speaker1.name} (${speaker1.company}).`,
        `Interlocuteurs présents : ${interlocutorsSummary || 'Non précisés'}.`,
        linkedRow ? `Dossier Monday rattaché : ${linkedRow.title} (${linkedRow.tableName}).` : '',
        contextText ? `--- MAILS & TEXTES DE CONTEXTE FOURNIS ---\n${contextText.slice(0, 12000)}` : '',
        docsFull ? `--- DOCUMENTS CHARGÉS ---\n${docsFull.slice(0, 12000)}` : '',
        transcriptFull
          ? `--- RETRANSCRIPTION EN DIRECT DE LA CONVERSATION ---\n${transcriptFull.slice(-12000)}`
          : `--- RETRANSCRIPTION EN DIRECT ---\n(Aucune parole transcrite pour l'instant)`,
        `\nRéponds en français de manière directe, structurée, opérationnelle et donne des éléments précis (chiffres, clauses, arguments ou formulation prête à dire à l'oral) à ${speaker1.name}.`,
      ]
        .filter(Boolean)
        .join('\n\n');

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                role: 'user',
                parts: [{ text: `${systemPrompt}\n\nQuestion de ${speaker1.name} : ${q}` }],
              },
            ],
          }),
        }
      );
      if (res.ok) {
        const data = await res.json();
        const aiReply = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (aiReply && aiReply.trim()) {
          return aiReply.trim();
        }
      }
    } catch (err) {
      console.warn('[Meetingly AI] Fallback local activé:', err);
    }
  }

  // 2. Moteur d'analyse contextuelle locale haute précision (croise Conversation + Mails + Documents)
  const qLower = q.toLowerCase();
  const otherLabel =
    otherSpeakers.length > 0
      ? otherSpeakers.map((p) => `${p.name || 'votre interlocuteur'}${p.company ? ` (${p.company})` : ''}`).join(', ')
      : 'votre interlocuteur';

  // Extraire les phrases pertinentes du contexte (mails/documents) et de la conversation selon les mots de la question
  const keywords = qLower
    .replace(/[^a-z0-9àâäéèêëîïôöùûüç\s]/gi, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 3 && !['dans', 'avec', 'pour', 'quel', 'quelle', 'quels', 'quelles', 'comment', 'avoir', 'cette', 'entre', 'plus', 'sont', 'vous', 'nous', 'dire', 'faire', 'mail', 'document', 'conversation'].includes(w));

  const contextSentences = [contextText, docsFull]
    .filter(Boolean)
    .join('\n')
    .split(/(?<=[.!?;\n])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 12);

  const matchingContextSentences =
    keywords.length > 0
      ? contextSentences.filter((s) => keywords.some((kw) => s.toLowerCase().includes(kw)))
      : contextSentences.slice(0, 4);

  const matchingTranscriptEntries =
    keywords.length > 0
      ? transcriptEntries.filter((t) => keywords.some((kw) => (t.text || '').toLowerCase().includes(kw)))
      : transcriptEntries.slice(-5);

  // Chiffres, montants, puissances ou dates détectés dans le contexte + conversation
  const numbersDetected = Array.from(
    new Set(
      (combinedKnowledge.match(/\b\d+(?:[.,]\d+)?\s*(?:€|k€|M€|%|kW|kWc|MW|MWh|kWh|m²|m2|ans|mois|jours|PRM)\b/gi) || []).map((x) =>
        x.trim()
      )
    )
  ).slice(0, 10);

  // Cas 1 : Demande de résumé de la conversation en cours
  if (/r[eé]sum|synth[eè]se|dit jusqu|point sur l/i.test(qLower)) {
    const recentLines = transcriptEntries.slice(-6);
    return [
      `📌 **Synthèse en direct de l'échange (${interlocutorsSummary || 'ENR COURTAGE'})** :`,
      recentLines.length > 0
        ? `• **Derniers points abordés à l'oral (${transcriptEntries.length} interventions)** :\n` +
          recentLines.map((l) => `  - [${l.timestamp}] **${l.speaker}** : « ${l.text} »`).join('\n')
        : `• Aucune intervention vocale enregistrée pour le moment (la transcription s'affiche dès que vous parlez).`,
      contextSentences.length > 0
        ? `• **Rappel des éléments clés issus des mails / documents fournis** :\n` +
          contextSentences
            .slice(0, 4)
            .map((s) => `  - ${s.slice(0, 220)}`)
            .join('\n')
        : '',
      numbersDetected.length > 0
        ? `• **Données chiffrées identifiées** : ${numbersDetected.join(' • ')}.`
        : '',
      `\n💡 **Suggestion pour ${speaker1.name}** : Vous pouvez valider ces points avec ${otherLabel} avant de passer au calendrier des prochaines étapes.`,
    ]
      .filter(Boolean)
      .join('\n\n');
  }

  // Cas 2 : Demande de rédaction de mail ou message de suivi
  if (/mail|email|courriel|[eé]cri|r[eé]dige/i.test(qLower)) {
    const destName = otherSpeakers[0]?.name || 'Madame, Monsieur';
    const destCompany = otherSpeakers[0]?.company ? ` (${otherSpeakers[0].company})` : '';
    return [
      `✉️ **Proposition de mail prête à envoyer à ${destName}${destCompany}** :`,
      `---`,
      `**Objet :** Suivi de notre échange — ${speaker1.company} x ${otherSpeakers[0]?.company || 'Projet Énergie'}`,
      ``,
      `Bonjour ${destName},`,
      ``,
      `Je vous remercie pour la qualité de notre échange de ce jour.`,
      transcriptEntries.length > 0
        ? `Comme évoqué ensemble lors de notre point (${transcriptEntries
            .slice(-3)
            .map((t) => t.text)
            .join(' / ')
            .slice(0, 180)}), nous avançons sur la validation technique et administrative du dossier.`
        : `Comme convenu lors de notre entretien, nous consolidons les éléments techniques, réglementaires et contractuels abordés ensemble.`,
      contextSentences.length > 0
        ? `En complément des éléments transmis (${contextSentences[0].slice(0, 140)}), nous restons à votre disposition pour finaliser les prochaines étapes.`
        : '',
      ``,
      `Bien cordialement,`,
      `**${speaker1.name}** — ${speaker1.role || 'Dirigeant'}, ${speaker1.company}`,
    ]
      .filter(Boolean)
      .join('\n');
  }

  // Cas 3 : Que répondre / Argumentaire / Vigilance / Vérification de cohérence avec les documents & mails
  const parts = [];
  parts.push(
    `🤖 **Analyse IA NELSON pour ${speaker1.name} (face à ${otherLabel})** :`
  );

  if (matchingContextSentences.length > 0) {
    parts.push(
      `📂 **Éléments trouvés dans vos documents & mails fournis** :\n` +
        matchingContextSentences
          .slice(0, 4)
          .map((s) => `• « ${s.slice(0, 240)} »`)
          .join('\n')
    );
  } else if (contextSentences.length > 0) {
    parts.push(
      `📂 **Contexte issu de vos documents / mails (${uploadedDocs.length} doc(s) joint(s))** :\n` +
        contextSentences
          .slice(0, 3)
          .map((s) => `• ${s.slice(0, 220)}`)
          .join('\n')
    );
  }

  if (matchingTranscriptEntries.length > 0) {
    parts.push(
      `🎙️ **Ce qui a été dit pendant la conversation à ce sujet** :\n` +
        matchingTranscriptEntries
          .slice(-4)
          .map((t) => `• [${t.timestamp}] **${t.speaker}** : « ${t.text} »`)
          .join('\n')
    );
  } else if (transcriptEntries.length > 0) {
    parts.push(
      `🎙️ **Dernières paroles captées en direct** :\n` +
        transcriptEntries
          .slice(-3)
          .map((t) => `• [${t.timestamp}] **${t.speaker}** : « ${t.text} »`)
          .join('\n')
    );
  }

  if (numbersDetected.length > 0) {
    parts.push(`📊 **Repères chiffrés détectés dans le dossier** : ${numbersDetected.join(' | ')}.`);
  }

  parts.push(
    `💡 **Ce que vous pouvez répondre / demander maintenant à ${otherLabel}** :\n` +
      `• *« Au vu des éléments que nous avons au dossier${
        numbersDetected.length > 0 ? ` (${numbersDetected.slice(0, 3).join(', ')})` : ''
      }, pouvons-nous confirmer ensemble ce point et verrouiller la prochaine échéance ? »*\n` +
      `• Vérifiez les 3 engagements clés : **périmètre technique / administratif**, **conditions financières ou contractuelles**, et **date de retour attendue**.`
  );

  return parts.join('\n\n');
}

