import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Mic,
  PhoneCall,
  Monitor,
  Play,
  Pause,
  Square,
  Download,
  Upload,
  FileText,
  Sparkles,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Users,
  Briefcase,
  Send,
  Volume2,
  RefreshCw,
  CheckSquare,
  FolderOpen,
  MessageSquarePlus,
} from 'lucide-react';
import apiService from '@/services/api';
import { getRowTitle } from '@/components/MondayUpdatesDrawer.jsx';
import { useAuth } from '@/contexts/AuthContext.jsx';
import {
  MeetingAudioRecorderService,
  saveMeetingToIndexedDB,
  getAllMeetingsFromIndexedDB,
  deleteMeetingFromIndexedDB,
  formatDurationHms,
  sanitizeFileToken,
  buildStructuredMeetingReport,
  exportMeetingReportToPDF,
} from '@/services/MeetingAudioRecorderService.js';

export default function MeetinglyCopilotView({ tabs = [] }) {
  const { user } = useAuth();

  // ── 1. RATTACHEMENT AUX TABLEAUX MONDAY ("Projets" & "LEADS") ─────────────
  const targetTabs = useMemo(() => {
    return (tabs || []).filter((t) => {
      const n = (t.name || '').toLowerCase();
      return n.includes('projet') || n.includes('lead');
    });
  }, [tabs]);

  const [mondayRowsByTab, setMondayRowsByTab] = useState({});
  const [selectedLinkedKey, setSelectedLinkedKey] = useState(''); // `${tableId}::${rowId}`
  const [dossierSearch, setDossierSearch] = useState('');

  useEffect(() => {
    const unsubs = [];
    targetTabs.forEach((tab) => {
      if (!tab.id) return;
      const unsub = apiService.subscribeToMondayRows(tab.id, (rows) => {
        setMondayRowsByTab((prev) => ({
          ...prev,
          [tab.id]: (rows || []).map((r) => ({
            ...r,
            tableId: tab.id,
            tableName: tab.name,
            title: getRowTitle(r, tab.columns || []),
          })),
        }));
      });
      if (unsub) unsubs.push(unsub);
    });
    return () => {
      unsubs.forEach((u) => {
        try {
          u();
        } catch (_) {}
      });
    };
  }, [targetTabs]);

  const allLinkableRows = useMemo(() => {
    const list = [];
    targetTabs.forEach((tab) => {
      const rows = mondayRowsByTab[tab.id] || [];
      rows.forEach((r) => {
        list.push({
          key: `${tab.id}::${r.id}`,
          tableId: tab.id,
          tableName: tab.name,
          rowId: r.id,
          title: r.title || 'Sans titre',
          data: r.data || {},
        });
      });
    });
    return list;
  }, [targetTabs, mondayRowsByTab]);

  const filteredLinkableRows = useMemo(() => {
    if (!dossierSearch.trim()) return allLinkableRows;
    const q = dossierSearch.toLowerCase();
    return allLinkableRows.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.tableName.toLowerCase().includes(q) ||
        Object.values(item.data || {}).some((v) => String(v || '').toLowerCase().includes(q))
    );
  }, [allLinkableRows, dossierSearch]);

  const selectedLinkedRow = useMemo(() => {
    return allLinkableRows.find((r) => r.key === selectedLinkedKey) || null;
  }, [allLinkableRows, selectedLinkedKey]);

  // ── 2. ÉTAT DE L'ENREGISTREUR AUDIO MULTIPISTE & TRANSCRIPTION ───────────
  const [recordMode, setRecordMode] = useState('phone'); // 'phone' | 'teams'
  const [recordingState, setRecordingState] = useState('idle'); // 'idle' | 'recording' | 'paused'
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [audioWarning, setAudioWarning] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [toastBanner, setToastBanner] = useState(null);

  const [currentAudioBlob, setCurrentAudioBlob] = useState(null);
  const [currentAudioUrl, setCurrentAudioUrl] = useState(null);
  const [currentAudioMime, setCurrentAudioMime] = useState('audio/webm');
  const [currentMeetingId, setCurrentMeetingId] = useState(null);

  const [transcriptEntries, setTranscriptEntries] = useState([]);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [activeSpeaker, setActiveSpeaker] = useState('ENR Courtage');
  const [quickNoteInput, setQuickNoteInput] = useState('');
  const [quickNotes, setQuickNotes] = useState([]);

  const recorderServiceRef = useRef(null);
  const timerIntervalRef = useRef(null);
  const elapsedSecondsRef = useRef(0);
  const activeSpeakerRef = useRef('ENR Courtage');
  const recordingStateRef = useRef('idle');
  const speechRecognitionRef = useRef(null);
  const waveformCanvasRef = useRef(null);
  const animFrameRef = useRef(null);
  const importAudioInputRef = useRef(null);

  useEffect(() => {
    activeSpeakerRef.current = activeSpeaker;
  }, [activeSpeaker]);

  useEffect(() => {
    recordingStateRef.current = recordingState;
  }, [recordingState]);

  const showToast = useCallback((msg, type = 'success') => {
    setToastBanner({ msg, type });
    setTimeout(() => {
      setToastBanner((prev) => (prev?.msg === msg ? null : prev));
    }, 4500);
  }, []);

  // ── 3. ÉTAT DES 6 SECTIONS ÉDITABLES DU COMPTE-RENDU ─────────────────────
  const [report, setReport] = useState(() =>
    buildStructuredMeetingReport({
      transcriptEntries: [],
      quickNotes: [],
      meta: { mode: 'phone' },
      linkedRow: null,
    })
  );

  // Mettre à jour automatiquement le dossier rattaché dans les infos de la réunion
  const handleSelectLinkedDossier = (key) => {
    setSelectedLinkedKey(key);
    const found = allLinkableRows.find((r) => r.key === key) || null;
    if (found) {
      setReport((prev) => ({
        ...prev,
        title:
          !prev.title || prev.title.includes('Client / Prospect')
            ? `Réunion & Suivi — ${found.title}`
            : prev.title,
        participants: `Yann BARBERIS (ENR Courtage), ${found.title}`,
        linkedTableId: found.tableId,
        linkedTableName: found.tableName,
        linkedRowId: found.rowId,
        linkedRowTitle: found.title,
      }));
    } else {
      setReport((prev) => ({
        ...prev,
        linkedTableId: '',
        linkedTableName: '',
        linkedRowId: '',
        linkedRowTitle: '',
      }));
    }
  };

  // ── 4. HISTORIQUE DES RÉUNIONS (INDEXEDDB) ───────────────────────────────
  const [meetingsHistory, setMeetingsHistory] = useState([]);
  const [playingHistoryId, setPlayingHistoryId] = useState(null);
  const [historyAudioUrls, setHistoryAudioUrls] = useState({});
  const [pushingMondayId, setPushingMondayId] = useState(null);

  const loadHistory = useCallback(async () => {
    const items = await getAllMeetingsFromIndexedDB();
    setMeetingsHistory(items);
    const urls = {};
    items.forEach((m) => {
      if (m.audioBlob instanceof Blob) {
        urls[m.id] = URL.createObjectURL(m.audioBlob);
      } else if (m.audioDataUrl) {
        urls[m.id] = m.audioDataUrl;
      }
    });
    setHistoryAudioUrls((prev) => {
      Object.values(prev).forEach((u) => {
        if (u && u.startsWith('blob:')) {
          try {
            URL.revokeObjectURL(u);
          } catch (_) {}
        }
      });
      return urls;
    });
  }, []);

  useEffect(() => {
    loadHistory();
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (recorderServiceRef.current) recorderServiceRef.current.cleanup();
      if (speechRecognitionRef.current) {
        try {
          speechRecognitionRef.current.stop();
        } catch (_) {}
      }
    };
  }, [loadHistory]);

  // ── 5. VISUALISEUR D'ONDE (WAVEFORM & SPECTRE DYNAMIQUE SUR CANVAS) ──────
  const startWaveformVisualizer = useCallback((analyser) => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    const canvas = waveformCanvasRef.current;
    if (!canvas || !analyser) return;

    const ctx = canvas.getContext('2d');
    const bufferLength = analyser.frequencyBinCount;
    const freqData = new Uint8Array(bufferLength);
    const timeData = new Uint8Array(bufferLength);

    const draw = () => {
      animFrameRef.current = requestAnimationFrame(draw);
      const W = canvas.width;
      const H = canvas.height;
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, W, H);

      // Grille subtile
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.12)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, H / 2);
      ctx.lineTo(W, H / 2);
      ctx.stroke();

      if (recordingStateRef.current === 'paused') {
        ctx.fillStyle = '#94a3b8';
        ctx.font = 'bold 12px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('⏸️ ENREGISTREMENT EN PAUSE', W / 2, H / 2 + 4);
        return;
      }

      analyser.getByteFrequencyData(freqData);
      analyser.getByteTimeDomainData(timeData);

      // Barres de spectre fréquentiel
      const barCount = 48;
      const step = Math.max(1, Math.floor(bufferLength / barCount));
      const barW = (W / barCount) * 0.68;
      const gap = (W / barCount) * 0.32;

      for (let i = 0; i < barCount; i++) {
        const val = freqData[i * step] || 0;
        const norm = val / 255;
        const barH = Math.max(4, norm * (H - 14));
        const x = i * (barW + gap) + gap / 2;
        const y = (H - barH) / 2;

        const grad = ctx.createLinearGradient(0, y, 0, y + barH);
        grad.addColorStop(0, '#38bdf8');
        grad.addColorStop(0.5, '#6366f1');
        grad.addColorStop(1, '#a855f7');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.roundRect(x, y, barW, barH, 3);
        ctx.fill();
      }

      // Ligne d'onde temporelle superposée
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgba(52, 211, 153, 0.85)';
      ctx.beginPath();
      const sliceWidth = W / bufferLength;
      let wx = 0;
      for (let i = 0; i < bufferLength; i++) {
        const v = timeData[i] / 128.0;
        const wy = (v * H) / 2;
        if (i === 0) ctx.moveTo(wx, wy);
        else ctx.lineTo(wx, wy);
        wx += sliceWidth;
      }
      ctx.lineTo(W, H / 2);
      ctx.stroke();
    };

    draw();
  }, []);

  const stopWaveformVisualizer = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    const canvas = waveformCanvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.25)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, canvas.height / 2);
      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.stroke();
    }
  }, []);

  // ── 6. TRANSCRIPTION CONTINUE EN DIRECT (WEB SPEECH API FR-FR) ───────────
  const startSpeechRecognition = useCallback(() => {
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRec) return;

    try {
      const recognition = new SpeechRec();
      recognition.lang = 'fr-FR';
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      recognition.onresult = (event) => {
        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const res = event.results[i];
          const txt = res[0]?.transcript || '';
          if (res.isFinal) {
            const cleanTxt = txt.trim();
            if (cleanTxt) {
              const stamp = formatDurationHms(elapsedSecondsRef.current);
              setTranscriptEntries((prev) => [
                ...prev,
                {
                  id: `tr_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                  timestamp: stamp,
                  speaker: activeSpeakerRef.current,
                  text: cleanTxt,
                },
              ]);
            }
          } else {
            interim += txt;
          }
        }
        setInterimTranscript(interim);
      };

      recognition.onerror = () => {};

      recognition.onend = () => {
        if (recordingStateRef.current === 'recording') {
          try {
            recognition.start();
          } catch (_) {}
        }
      };

      recognition.start();
      speechRecognitionRef.current = recognition;
    } catch (err) {
      console.warn('[Meetingly] Web Speech API non disponible:', err);
    }
  }, []);

  const stopSpeechRecognition = useCallback(() => {
    setInterimTranscript('');
    if (speechRecognitionRef.current) {
      try {
        speechRecognitionRef.current.onend = null;
        speechRecognitionRef.current.stop();
      } catch (_) {}
      speechRecognitionRef.current = null;
    }
  }, []);

  // ── 7. CONTRÔLES D'ENREGISTREMENT (DÉMARRER / PAUSE / ARRÊTER) ───────────
  const handleStartRecording = async () => {
    setErrorMessage(null);
    setAudioWarning(null);
    try {
      const service = new MeetingAudioRecorderService();
      recorderServiceRef.current = service;

      const startInfo = await service.start(recordMode);
      if (startInfo.systemAudioWarning) {
        setAudioWarning(startInfo.systemAudioWarning);
      }

      setRecordingState('recording');
      recordingStateRef.current = 'recording';
      setElapsedSeconds(0);
      elapsedSecondsRef.current = 0;

      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = setInterval(() => {
        if (recordingStateRef.current === 'recording') {
          elapsedSecondsRef.current += 1;
          setElapsedSeconds(elapsedSecondsRef.current);
        }
      }, 1000);

      startWaveformVisualizer(startInfo.analyser);
      startSpeechRecognition();

      setReport((prev) => ({
        ...prev,
        dateTime: new Date().toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }),
        channel:
          recordMode === 'teams'
            ? 'Visioconférence Microsoft Teams / Meet'
            : 'Appel Téléphonique',
      }));
    } catch (err) {
      setErrorMessage(
        err?.message ||
          "Impossible de démarrer l'enregistrement audio. Vérifiez les permissions du microphone."
      );
      setRecordingState('idle');
      recordingStateRef.current = 'idle';
    }
  };

  const handleTogglePause = () => {
    if (!recorderServiceRef.current) return;
    if (recordingState === 'recording') {
      recorderServiceRef.current.pause();
      setRecordingState('paused');
      recordingStateRef.current = 'paused';
      stopSpeechRecognition();
    } else if (recordingState === 'paused') {
      recorderServiceRef.current.resume();
      setRecordingState('recording');
      recordingStateRef.current = 'recording';
      startSpeechRecognition();
    }
  };

  const handleStopAndGenerateReport = async () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    stopSpeechRecognition();
    stopWaveformVisualizer();

    const finalDurationStr = formatDurationHms(elapsedSecondsRef.current);
    setRecordingState('idle');
    recordingStateRef.current = 'idle';

    let recordedBlob = null;
    let recordedMime = 'audio/webm';

    if (recorderServiceRef.current) {
      const res = await recorderServiceRef.current.stop();
      recordedBlob = res.blob;
      recordedMime = res.mimeType || 'audio/webm';
      recorderServiceRef.current = null;
    }

    if (recordedBlob && recordedBlob.size > 0) {
      if (currentAudioUrl && currentAudioUrl.startsWith('blob:')) {
        try {
          URL.revokeObjectURL(currentAudioUrl);
        } catch (_) {}
      }
      const url = URL.createObjectURL(recordedBlob);
      setCurrentAudioBlob(recordedBlob);
      setCurrentAudioUrl(url);
      setCurrentAudioMime(recordedMime);
    }

    // Structurer automatiquement les 6 sections du compte-rendu
    const generatedReport = buildStructuredMeetingReport({
      transcriptEntries,
      quickNotes,
      meta: {
        mode: recordMode,
        title: report.title,
        dateTime:
          report.dateTime ||
          new Date().toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }),
        duration: finalDurationStr,
        participants: report.participants,
        statusPriority: report.statusPriority,
        includeTranscriptInPdf: report.includeTranscriptInPdf,
      },
      linkedRow: selectedLinkedRow,
    });

    setReport(generatedReport);

    // Sauvegarder automatiquement dans IndexedDB (Historique)
    const meetingId = currentMeetingId || `mtg_${Date.now()}`;
    setCurrentMeetingId(meetingId);

    const recordToSave = {
      id: meetingId,
      createdAt: new Date().toISOString(),
      mode: recordMode,
      duration: finalDurationStr,
      mimeType: recordedMime,
      audioBlob: recordedBlob,
      report: generatedReport,
      transcriptEntries,
      quickNotes,
    };

    try {
      await saveMeetingToIndexedDB(recordToSave);
      await loadHistory();
      showToast('Enregistrement terminé et compte-rendu structuré automatiquement !');
    } catch (err) {
      console.warn('[Meetingly] Sauvegarde IndexedDB:', err);
    }
  };

  // ── 8. IMPORT D'UN FICHIER AUDIO EXTERNE (.mp3, .wav, .m4a, .webm) ───────
  const handleImportAudioFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    setErrorMessage(null);
    const url = URL.createObjectURL(file);

    // Lire la durée du fichier audio importé
    const durationSec = await new Promise((resolve) => {
      const tempAudio = document.createElement('audio');
      tempAudio.preload = 'metadata';
      tempAudio.onloadedmetadata = () => {
        if (tempAudio.duration && isFinite(tempAudio.duration)) {
          resolve(Math.round(tempAudio.duration));
        } else {
          resolve(0);
        }
      };
      tempAudio.onerror = () => resolve(0);
      tempAudio.src = url;
    });

    const durStr = formatDurationHms(durationSec);
    setElapsedSeconds(durationSec);
    elapsedSecondsRef.current = durationSec;
    setCurrentAudioBlob(file);
    setCurrentAudioUrl(url);
    setCurrentAudioMime(file.type || 'audio/mpeg');

    const cleanFileBase = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]+/g, ' ');
    const importedNote = {
      id: `note_${Date.now()}`,
      timestamp: '00:00:00',
      text: `Fichier audio importé : ${file.name} (${(file.size / (1024 * 1024)).toFixed(2)} Mo).`,
    };
    const nextNotes = [...quickNotes, importedNote];
    setQuickNotes(nextNotes);

    const generatedReport = buildStructuredMeetingReport({
      transcriptEntries,
      quickNotes: nextNotes,
      meta: {
        mode: 'import',
        title: selectedLinkedRow
          ? `Compte-Rendu — ${selectedLinkedRow.title}`
          : `Compte-Rendu Audio — ${cleanFileBase}`,
        dateTime: new Date().toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }),
        duration: durStr,
        participants: report.participants,
        statusPriority: report.statusPriority,
        includeTranscriptInPdf: report.includeTranscriptInPdf,
      },
      linkedRow: selectedLinkedRow,
    });

    setReport(generatedReport);

    const meetingId = `mtg_imp_${Date.now()}`;
    setCurrentMeetingId(meetingId);
    await saveMeetingToIndexedDB({
      id: meetingId,
      createdAt: new Date().toISOString(),
      mode: 'import',
      duration: durStr,
      mimeType: file.type || 'audio/mpeg',
      audioBlob: file,
      report: generatedReport,
      transcriptEntries,
      quickNotes: nextNotes,
    });
    await loadHistory();
    showToast(`Fichier audio « ${file.name} » importé et structuré avec succès !`);
  };

  // ── 9. RÉGÉNÉRATION DE LA SYNTHÈSE & SAUVEGARDE DES MODIFICATIONS ────────
  const handleRegenerateSummary = async () => {
    const regenerated = buildStructuredMeetingReport({
      transcriptEntries,
      quickNotes,
      meta: {
        mode: recordMode,
        title: report.title,
        dateTime: report.dateTime,
        duration: report.duration || formatDurationHms(elapsedSeconds),
        participants: report.participants,
        statusPriority: report.statusPriority,
        includeTranscriptInPdf: report.includeTranscriptInPdf,
      },
      linkedRow: selectedLinkedRow,
    });
    setReport(regenerated);

    if (currentMeetingId) {
      await saveMeetingToIndexedDB({
        id: currentMeetingId,
        createdAt: new Date().toISOString(),
        mode: recordMode,
        duration: regenerated.duration,
        mimeType: currentAudioMime,
        audioBlob: currentAudioBlob,
        report: regenerated,
        transcriptEntries,
        quickNotes,
      });
      await loadHistory();
    }
    showToast('Synthèse et structure du compte-rendu régénérées !');
  };

  const handleSaveCurrentChanges = async () => {
    const meetingId = currentMeetingId || `mtg_${Date.now()}`;
    setCurrentMeetingId(meetingId);
    await saveMeetingToIndexedDB({
      id: meetingId,
      createdAt: new Date().toISOString(),
      mode: recordMode,
      duration: report.duration || formatDurationHms(elapsedSeconds),
      mimeType: currentAudioMime,
      audioBlob: currentAudioBlob,
      report,
      transcriptEntries,
      quickNotes,
    });
    await loadHistory();
    showToast('Compte-rendu sauvegardé dans les archives Meetingly IA !');
  };

  // ── 10. TÉLÉCHARGEMENT DU FICHIER AUDIO (.webm / .mp3 / .wav) ────────────
  const handleDownloadAudio = (blob, titleOrClient, dateStr, mimeType = 'audio/webm') => {
    if (!blob) return;
    const ext = mimeType.includes('mp4')
      ? 'm4a'
      : mimeType.includes('mpeg') || mimeType.includes('mp3')
      ? 'mp3'
      : mimeType.includes('wav')
      ? 'wav'
      : 'webm';
    const token = sanitizeFileToken(titleOrClient || 'Client');
    const cleanDate = (dateStr ? new Date(dateStr) : new Date()).toISOString().slice(0, 10);
    const filename = `Audio_Reunion_${token}_${cleanDate}.${ext}`;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  };

  // ── 11. POUSSER LE COMPTE-RENDU DANS MONDAY (COLONNE MAJ) ─────────────────
  const handlePushToMonday = async (targetReport = report) => {
    const tableId = targetReport.linkedTableId || selectedLinkedRow?.tableId;
    const rowId = targetReport.linkedRowId || selectedLinkedRow?.rowId;

    if (!tableId || !rowId) {
      setErrorMessage(
        'Veuillez sélectionner un dossier « Projets » ou « LEADS » à rattacher avant de pousser le compte-rendu dans Monday.'
      );
      return;
    }

    setPushingMondayId(rowId);
    setErrorMessage(null);

    try {
      const tabRows = mondayRowsByTab[tableId] || [];
      const targetRow = tabRows.find((r) => r.id === rowId);
      if (!targetRow) {
        throw new Error('Ligne introuvable dans le tableau Monday sélectionné.');
      }

      const authorName = user?.displayName || user?.firstName || user?.name || 'Yann BARBERIS';
      const authorAvatar = user?.photoURL || user?.avatar || '/avatars/yann.jpg';
      const authorRole = user?.role || 'ENR COURTAGE — Copilote Meetingly IA';

      const actionsFormatted = (targetReport.actionPlan || [])
        .map((a, idx) => `  ${idx + 1}. [${a.owner || 'ENR Courtage'} — ${a.dueDate || 'À définir'}] ${a.action}`)
        .join('\n');

      const updateText = [
        `🎙️ COMPTE-RENDU DE RÉUNION (${targetReport.channel || 'Appel / Visio'})`,
        `📌 Objet : ${targetReport.title || 'Point Projet'}`,
        `📅 Date : ${targetReport.dateTime || new Date().toLocaleDateString('fr-FR')} • Durée : ${targetReport.duration || '00:00:00'}`,
        `👥 Participants : ${targetReport.participants || 'ENR Courtage & Client'}`,
        ``,
        `🔹 SYNTHÈSE EXÉCUTIVE :`,
        `${targetReport.executiveSummary || '—'}`,
        ``,
        `🔹 POINTS CLÉS TECHNIQUES & FINANCIERS :`,
        `${targetReport.keyPointsText || '—'}`,
        ``,
        `✅ DÉCISIONS ACTÉES :`,
        `${targetReport.decisionsText || '—'}`,
        ``,
        `📋 PLAN D'ACTION (NEXT STEPS) :`,
        `${actionsFormatted || '  • Aucun point en attente'}`,
      ].join('\n');

      const existingUpdates = Array.isArray(targetRow.data?.__updates)
        ? targetRow.data.__updates
        : Array.isArray(targetRow.updates)
        ? targetRow.updates
        : [];

      const newUpdateObj = {
        id: `upd_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        author: authorName,
        authorId: user?.uid || user?.id || 'unknown',
        authorEmail: user?.email || '',
        avatar: authorAvatar,
        role: authorRole,
        text: updateText,
        timestamp: new Date().toISOString(),
        likes: 0,
        liked: false,
      };

      const updatedData = {
        ...(targetRow.data || {}),
        __updates: [newUpdateObj, ...existingUpdates],
      };

      await apiService.updateMondayRow(tableId, rowId, { data: updatedData });

      try {
        const { createComment } = await import('@/services/firebase/comments.service');
        const uid = user?.uid || user?.id || 'unknown';
        await createComment(rowId, uid, authorName, updateText, null, user?.email, {
          context: 'monday',
          tableId,
          tableName: targetReport.linkedTableName || 'Monday',
          rowName: targetReport.linkedRowTitle || targetRow.title || 'Dossier',
        });
      } catch (_) {}

      showToast(
        `Compte-rendu poussé dans la colonne MAJ de « ${
          targetReport.linkedRowTitle || targetRow.title
        } » (${targetReport.linkedTableName || 'Monday'}) !`
      );
    } catch (err) {
      setErrorMessage(
        err?.message || "Erreur lors de l'envoi du compte-rendu dans la colonne MAJ de Monday."
      );
    } finally {
      setPushingMondayId(null);
    }
  };

  // ── 12. AJOUT DE NOTE RAPIDE HORODATÉE & TAGS MÉTIERS ────────────────────
  const handleAddQuickNote = (e) => {
    if (e) e.preventDefault();
    if (!quickNoteInput.trim()) return;
    const stamp = formatDurationHms(elapsedSeconds);
    const newEntry = {
      id: `tr_manual_${Date.now()}`,
      timestamp: stamp,
      speaker: activeSpeaker,
      text: quickNoteInput.trim(),
    };
    setTranscriptEntries((prev) => [...prev, newEntry]);
    setQuickNotes((prev) => [...prev, { id: newEntry.id, timestamp: stamp, text: quickNoteInput.trim() }]);
    setQuickNoteInput('');
  };

  const handleInsertPresetTag = (tagSnippet) => {
    setReport((prev) => ({
      ...prev,
      keyPointsText: prev.keyPointsText
        ? `${prev.keyPointsText}\n• ${tagSnippet}`
        : `• ${tagSnippet}`,
    }));
  };

  const handleAddActionRow = () => {
    setReport((prev) => ({
      ...prev,
      actionPlan: [
        ...(prev.actionPlan || []),
        {
          id: `act_${Date.now()}`,
          action: '',
          owner: 'ENR Courtage',
          dueDate: new Date(Date.now() + 7 * 86400000).toLocaleDateString('fr-FR'),
        },
      ],
    }));
  };

  const handleUpdateActionRow = (id, field, value) => {
    setReport((prev) => ({
      ...prev,
      actionPlan: (prev.actionPlan || []).map((a) => (a.id === id ? { ...a, [field]: value } : a)),
    }));
  };

  const handleDeleteActionRow = (id) => {
    setReport((prev) => ({
      ...prev,
      actionPlan: (prev.actionPlan || []).filter((a) => a.id !== id),
    }));
  };

  const handleLoadMeetingFromHistory = (item) => {
    setCurrentMeetingId(item.id);
    setRecordMode(item.mode === 'teams' ? 'teams' : 'phone');
    setReport(item.report || buildStructuredMeetingReport({ meta: item }));
    setTranscriptEntries(item.transcriptEntries || []);
    setQuickNotes(item.quickNotes || []);
    if (item.audioBlob instanceof Blob) {
      setCurrentAudioBlob(item.audioBlob);
      setCurrentAudioUrl(historyAudioUrls[item.id] || URL.createObjectURL(item.audioBlob));
      setCurrentAudioMime(item.mimeType || 'audio/webm');
    }
    if (item.report?.linkedTableId && item.report?.linkedRowId) {
      setSelectedLinkedKey(`${item.report.linkedTableId}::${item.report.linkedRowId}`);
    }
    showToast(`Compte-rendu « ${item.report?.title || 'Réunion'} » chargé dans l'éditeur.`);
  };

  const handleDeleteHistoryItem = async (id) => {
    await deleteMeetingFromIndexedDB(id);
    if (currentMeetingId === id) {
      setCurrentMeetingId(null);
    }
    await loadHistory();
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Bandeau supérieur Meetingly IA */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-5 text-white border border-indigo-500/30 shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
              🎙️ MEETINGLY IA — ENREGISTREUR MULTIPISTE & COPILOTE
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
              Téléphone • Microsoft Teams • Google Meet • Zoom
            </span>
          </div>
          <h2 className="text-xl lg:text-2xl font-black tracking-tight">
            Enregistreur Audio Multipiste & Générateur de Compte-Rendu PDF A4
          </h2>
          <p className="text-xs lg:text-sm text-slate-300">
            Capturez simultanément votre micro et le son système de vos réunions Teams/Meet ou appels téléphoniques, structurez le compte-rendu ENR COURTAGE et poussez-le en 1 clic dans vos tableaux Monday.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <input
            ref={importAudioInputRef}
            type="file"
            accept=".mp3,.wav,.m4a,.webm,.ogg,audio/*"
            onChange={handleImportAudioFile}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => importAudioInputRef.current?.click()}
            className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-600 text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-sm"
          >
            <FolderOpen className="w-4 h-4 text-amber-400" />
            <span>📂 Importer un fichier audio (.mp3, .wav, .m4a, .webm)</span>
          </button>

          <button
            type="button"
            onClick={() => exportMeetingReportToPDF(report, transcriptEntries)}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-extrabold flex items-center gap-2 shadow-lg shadow-blue-600/30 transition-all cursor-pointer"
          >
            <FileText className="w-4 h-4" />
            <span>📄 Exporter le Compte-Rendu en PDF (A4)</span>
          </button>
        </div>
      </div>

      {/* Alertes & Toasts */}
      {toastBanner && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{toastBanner.msg}</span>
          </div>
          <button onClick={() => setToastBanner(null)} className="text-emerald-700 hover:underline text-[11px]">
            Fermer
          </button>
        </div>
      )}

      {audioWarning && (
        <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs font-semibold flex items-start gap-2.5 shadow-sm">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1">{audioWarning}</div>
          <button onClick={() => setAudioWarning(null)} className="text-amber-800 font-bold text-[11px]">
            ✕
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-semibold flex items-start gap-2.5 shadow-sm">
          <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <div className="flex-1">{errorMessage}</div>
          <button onClick={() => setErrorMessage(null)} className="text-red-800 font-bold text-[11px]">
            ✕
          </button>
        </div>
      )}

      {/* GRILLE PRINCIPALE : GAUCHE (Enregistreur + Compte-Rendu 6 sections) / DROITE (Historique & Archives Monday) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* ═══ COLONNE GAUCHE & CENTRALE (8/12) ═══════════════════════════════ */}
        <div className="xl:col-span-8 space-y-6">
          {/* BLOC A — CONSOLE D'ENREGISTREMENT AUDIO MULTIPISTE */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <Mic className="w-4 h-4 text-indigo-600" />
                  <span>1. Console d'Enregistrement Audio Multipiste</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Choisissez la source sonore et rattachez l'échange à une ligne de vos tableaux Projets ou LEADS.
                </p>
              </div>

              {/* Chronomètre numérique */}
              <div className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-xl border border-slate-700">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    recordingState === 'recording'
                      ? 'bg-red-500 animate-ping'
                      : recordingState === 'paused'
                      ? 'bg-amber-400'
                      : 'bg-slate-500'
                  }`}
                />
                <Clock className="w-4 h-4 text-indigo-400" />
                <span className="font-mono text-lg font-black tracking-wider">
                  {formatDurationHms(elapsedSeconds)}
                </span>
              </div>
            </div>

            {/* Sélection du Mode : Appel Téléphonique vs Réunion Teams / Meet / Zoom */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <button
                type="button"
                disabled={recordingState !== 'idle'}
                onClick={() => setRecordMode('phone')}
                className={`p-3.5 rounded-xl border text-left transition-all flex items-start gap-3 cursor-pointer ${
                  recordMode === 'phone'
                    ? 'bg-blue-50/90 border-blue-500 ring-2 ring-blue-500/20'
                    : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                } ${recordingState !== 'idle' ? 'opacity-60 cursor-not-allowed' : ''}`}
              >
                <div
                  className={`p-2.5 rounded-xl ${
                    recordMode === 'phone' ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  <PhoneCall className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-extrabold text-slate-900">
                    📞 Mode 1 — Appel Téléphonique / Micro Salle
                  </div>
                  <p className="text-[11px] text-slate-600 mt-0.5 leading-snug">
                    Capte votre voix et le téléphone posé en haut-parleur (gain auto + sans coupure d'écho).
                  </p>
                </div>
              </button>

              <button
                type="button"
                disabled={recordingState !== 'idle'}
                onClick={() => setRecordMode('teams')}
                className={`p-3.5 rounded-xl border text-left transition-all flex items-start gap-3 cursor-pointer ${
                  recordMode === 'teams'
                    ? 'bg-indigo-50/90 border-indigo-500 ring-2 ring-indigo-500/20'
                    : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                } ${recordingState !== 'idle' ? 'opacity-60 cursor-not-allowed' : ''}`}
              >
                <div
                  className={`p-2.5 rounded-xl ${
                    recordMode === 'teams' ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  <Monitor className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-extrabold text-slate-900">
                    💻 Mode 2 — Réunion Teams / Google Meet / Zoom
                  </div>
                  <p className="text-[11px] text-slate-600 mt-0.5 leading-snug">
                    Mixage Web Audio API : fusionne votre microphone et le son système de vos interlocuteurs sur 1 piste.
                  </p>
                </div>
              </button>
            </div>

            {/* Sélecteur de Dossier Monday (Projets / LEADS) */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
              <div className="md:col-span-5">
                <label className="block text-[11px] font-extrabold text-slate-700 mb-1">
                  🔍 Filtrer un dossier Monday (Projets / LEADS)
                </label>
                <input
                  type="text"
                  value={dossierSearch}
                  onChange={(e) => setDossierSearch(e.target.value)}
                  placeholder="Rechercher un nom de client, commune, projet..."
                  className="w-full text-xs rounded-lg border border-slate-300 bg-white px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div className="md:col-span-7">
                <label className="block text-[11px] font-extrabold text-slate-700 mb-1">
                  🔗 Dossier Monday rattaché ({filteredLinkableRows.length} disponibles)
                </label>
                <select
                  value={selectedLinkedKey}
                  onChange={(e) => handleSelectLinkedDossier(e.target.value)}
                  className="w-full text-xs font-semibold rounded-lg border border-slate-300 bg-white px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  <option value="">— Aucun dossier rattaché (Réunion libre) —</option>
                  {filteredLinkableRows.map((item) => (
                    <option key={item.key} value={item.key}>
                      [{item.tableName}] {item.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Visualiseur d'onde (Waveform / Spectre Canvas) & Boutons d'action */}
            <div className="space-y-3">
              <div className="relative rounded-xl overflow-hidden border border-slate-800 bg-slate-950 h-20 flex items-center justify-center">
                <canvas
                  ref={waveformCanvasRef}
                  width={720}
                  height={80}
                  className="w-full h-20 block"
                />
                {recordingState === 'idle' && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <span className="text-xs font-semibold text-slate-400 bg-slate-900/80 px-3 py-1 rounded-full border border-slate-700">
                      Spectre audio prêt • Cliquez sur « Enregistrer » pour démarrer la capture
                    </span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between gap-2.5 flex-wrap">
                <div className="flex items-center gap-2 flex-wrap">
                  {recordingState === 'idle' ? (
                    <button
                      type="button"
                      onClick={handleStartRecording}
                      className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-extrabold flex items-center gap-2 shadow-md shadow-red-600/20 transition-all cursor-pointer"
                    >
                      <span className="w-2.5 h-2.5 rounded-full bg-white animate-pulse" />
                      <span>⏺️ Enregistrer ({recordMode === 'teams' ? 'Teams / Visio' : 'Téléphone / Micro'})</span>
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={handleTogglePause}
                        className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-extrabold flex items-center gap-2 shadow-sm transition-all cursor-pointer"
                      >
                        {recordingState === 'paused' ? (
                          <>
                            <Play className="w-4 h-4" />
                            <span>▶️ Reprendre</span>
                          </>
                        ) : (
                          <>
                            <Pause className="w-4 h-4" />
                            <span>⏸️ Pause</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={handleStopAndGenerateReport}
                        className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-extrabold flex items-center gap-2 shadow-md transition-all cursor-pointer"
                      >
                        <Square className="w-4 h-4 text-red-400 fill-red-400" />
                        <span>⏹️ Arrêter & Générer le Compte-Rendu</span>
                      </button>
                    </>
                  )}
                </div>

                {/* Lecteur Audio immédiat si une piste est disponible */}
                {currentAudioUrl && (
                  <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 flex-1 min-w-[260px]">
                    <Volume2 className="w-4 h-4 text-indigo-600 shrink-0" />
                    <audio controls src={currentAudioUrl} className="h-8 flex-1 max-w-xs" />
                    {currentAudioBlob && (
                      <button
                        type="button"
                        onClick={() =>
                          handleDownloadAudio(
                            currentAudioBlob,
                            report.linkedRowTitle || report.title,
                            new Date().toISOString(),
                            currentAudioMime
                          )
                        }
                        className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 text-[11px] font-bold flex items-center gap-1 shrink-0 cursor-pointer"
                        title="Télécharger l'enregistrement audio"
                      >
                        <Download className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Télécharger l'audio</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Barre de transcription en direct & prise de notes horodatées */}
            <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 space-y-2.5">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-extrabold text-slate-800">
                    💬 Transcription en direct (fr-FR) & Notes horodatées
                  </span>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-bold">
                    {transcriptEntries.length} intervention(s)
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-slate-500 font-semibold">Intervenant actif :</span>
                  {['ENR Courtage', 'Client', 'Partenaire'].map((spk) => (
                    <button
                      key={spk}
                      type="button"
                      onClick={() => setActiveSpeaker(spk)}
                      className={`px-2 py-0.5 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                        activeSpeaker === spk
                          ? 'bg-indigo-600 text-white'
                          : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {spk}
                    </button>
                  ))}
                </div>
              </div>

              {/* Flux de transcription */}
              <div className="max-h-36 overflow-y-auto bg-white rounded-lg border border-slate-200 p-2.5 space-y-1.5 text-xs">
                {transcriptEntries.length === 0 && !interimTranscript ? (
                  <p className="text-slate-400 italic text-xs">
                    Les paroles transcrites en direct et vos notes rapides s'afficheront ici avec leur horodatage...
                  </p>
                ) : (
                  transcriptEntries.map((item) => (
                    <div key={item.id} className="flex items-start gap-2 text-xs leading-relaxed">
                      <span className="font-mono text-[10px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded shrink-0">
                        {item.timestamp}
                      </span>
                      <span className="font-bold text-slate-800 shrink-0">{item.speaker} :</span>
                      <span className="text-slate-700 flex-1">{item.text}</span>
                      <button
                        type="button"
                        onClick={() =>
                          setTranscriptEntries((prev) => prev.filter((x) => x.id !== item.id))
                        }
                        className="text-slate-300 hover:text-red-500 text-[10px]"
                      >
                        ✕
                      </button>
                    </div>
                  ))
                )}
                {interimTranscript && (
                  <div className="text-xs text-indigo-600 italic animate-pulse">
                    [{formatDurationHms(elapsedSeconds)}] {activeSpeaker} : {interimTranscript}...
                  </div>
                )}
              </div>

              {/* Saisie rapide d'une note horodatée */}
              <form onSubmit={handleAddQuickNote} className="flex items-center gap-2">
                <input
                  type="text"
                  value={quickNoteInput}
                  onChange={(e) => setQuickNoteInput(e.target.value)}
                  placeholder="Saisissez une note clé en direct (ex: PRM 16238205462430, 4 armoires BESS 500 kW, accord DP)..."
                  className="flex-1 text-xs rounded-lg border border-slate-300 bg-white px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                />
                <button
                  type="submit"
                  className="px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 shrink-0 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Ajouter note</span>
                </button>
              </form>
            </div>
          </div>

          {/* BLOC B — LES 6 SECTIONS ÉDITABLES DU COMPTE-RENDU AVANT EXPORT PDF */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-blue-600" />
                  <span>2. Éditeur Structuré du Compte-Rendu Officiel (6 Sections)</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Vérifiez ou complétez les 6 sections ci-dessous avant d'exporter le PDF A4 ou de pousser dans Monday.
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={handleRegenerateSummary}
                  className="px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>✨ Régénérer la synthèse</span>
                </button>
                <button
                  type="button"
                  onClick={handleSaveCurrentChanges}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Sauvegarder l'archive</span>
                </button>
              </div>
            </div>

            {/* SECTION 1 — Informations de la réunion */}
            <div className="space-y-3 bg-slate-50/80 p-4 rounded-xl border border-slate-200">
              <div className="text-xs font-black text-slate-800 uppercase tracking-wide">
                Section 1 — Informations de la réunion
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Titre / Objet de la réunion
                  </label>
                  <input
                    type="text"
                    value={report.title || ''}
                    onChange={(e) => setReport((prev) => ({ ...prev, title: e.target.value }))}
                    className="w-full text-xs font-bold rounded-lg border border-slate-300 bg-white px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Canal d'échange
                  </label>
                  <select
                    value={report.channel || 'Appel Téléphonique'}
                    onChange={(e) => setReport((prev) => ({ ...prev, channel: e.target.value }))}
                    className="w-full text-xs font-semibold rounded-lg border border-slate-300 bg-white px-3 py-2"
                  >
                    <option value="Appel Téléphonique">Appel Téléphonique</option>
                    <option value="Visioconférence Microsoft Teams / Meet">
                      Visioconférence Microsoft Teams / Meet
                    </option>
                    <option value="Réunion Présentielle / Visite Technique">
                      Réunion Présentielle / Visite Technique
                    </option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Date & Heure
                  </label>
                  <input
                    type="text"
                    value={report.dateTime || ''}
                    onChange={(e) => setReport((prev) => ({ ...prev, dateTime: e.target.value }))}
                    className="w-full text-xs rounded-lg border border-slate-300 bg-white px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Durée</label>
                  <input
                    type="text"
                    value={report.duration || ''}
                    onChange={(e) => setReport((prev) => ({ ...prev, duration: e.target.value }))}
                    className="w-full text-xs font-mono rounded-lg border border-slate-300 bg-white px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Statut / Priorité
                  </label>
                  <input
                    type="text"
                    value={report.statusPriority || ''}
                    onChange={(e) =>
                      setReport((prev) => ({ ...prev, statusPriority: e.target.value }))
                    }
                    className="w-full text-xs font-semibold rounded-lg border border-slate-300 bg-white px-3 py-2"
                  />
                </div>
                <div className="md:col-span-3">
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Participants / Interlocuteurs
                  </label>
                  <input
                    type="text"
                    value={report.participants || ''}
                    onChange={(e) =>
                      setReport((prev) => ({ ...prev, participants: e.target.value }))
                    }
                    className="w-full text-xs rounded-lg border border-slate-300 bg-white px-3 py-2"
                  />
                </div>
              </div>
            </div>

            {/* SECTION 2 — Synthèse Exécutive (Executive Summary) */}
            <div className="space-y-1.5">
              <label className="block text-xs font-black text-blue-900 uppercase tracking-wide">
                Section 2 — Synthèse Exécutive (Executive Summary)
              </label>
              <textarea
                rows={4}
                value={report.executiveSummary || ''}
                onChange={(e) =>
                  setReport((prev) => ({ ...prev, executiveSummary: e.target.value }))
                }
                className="w-full text-xs leading-relaxed rounded-xl border border-blue-200 bg-blue-50/30 p-3 focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Résumé clair en 4 à 5 lignes des enjeux de l'échange..."
              />
            </div>

            {/* SECTION 3 — Points Clés & Données Techniques / Financières Évoquées */}
            <div className="space-y-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <label className="block text-xs font-black text-slate-800 uppercase tracking-wide">
                  Section 3 — Points Clés & Données Techniques / Financières Évoquées
                </label>
                <div className="flex items-center gap-1 flex-wrap">
                  {[
                    {
                      label: '+ BESS 500 kW (< 20 m²)',
                      text: 'Station Batteries BESS Stand-Alone 500 kW / 1044 kWh (4 armoires CESC / SAFRA, dalle béton 6.20m × 3.20m = 19.84 m²).',
                    },
                    {
                      label: '+ Solaime / Ombrière Barconnière',
                      text: 'Étude photovoltaïque (Solaime / Ombrière Barconnière / Séchoir BatiTech) : dimensionnement kWc et intégration.',
                    },
                    {
                      label: '+ Enedis PRM & Raccordement',
                      text: 'Collecte Mandat eIDAS Enedis Datahub SGE Tiers, vérification PRM et distance PDL / Transfo HTA.',
                    },
                    {
                      label: '+ Urbanisme DP / PC',
                      text: 'Constitution du dossier Déclaration Préalable (DP1 à DP8 + notice sécurité incendie BESS) et dépôt mairie.',
                    },
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => handleInsertPresetTag(preset.text)}
                      className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 border border-slate-200 text-[10px] font-bold transition-colors cursor-pointer"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
              <textarea
                rows={5}
                value={report.keyPointsText || ''}
                onChange={(e) => setReport((prev) => ({ ...prev, keyPointsText: e.target.value }))}
                className="w-full text-xs leading-relaxed rounded-xl border border-slate-300 bg-white p-3 focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="• Puissances (kW / MWh), modèles (Batteries BESS SAFRA, Solaime, Séchoir BatiTech, Ombrières Barconnière), Enedis (PRM, BT/HTA), Urbanisme (DP/PC)..."
              />
            </div>

            {/* SECTION 4 — Décisions Actées & Accords */}
            <div className="space-y-1.5">
              <label className="block text-xs font-black text-emerald-900 uppercase tracking-wide">
                Section 4 — Décisions Actées & Accords Validés en Séance
              </label>
              <textarea
                rows={3}
                value={report.decisionsText || ''}
                onChange={(e) => setReport((prev) => ({ ...prev, decisionsText: e.target.value }))}
                className="w-full text-xs leading-relaxed rounded-xl border border-emerald-200 bg-emerald-50/30 p-3 focus:ring-2 focus:ring-emerald-500 outline-none"
                placeholder="• Liste à puces des validations obtenues pendant l'appel..."
              />
            </div>

            {/* SECTION 5 — Plan d'Action & Prochaines Étapes (Next Steps) */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-black text-slate-800 uppercase tracking-wide">
                  Section 5 — Plan d'Action & Prochaines Étapes (Next Steps)
                </label>
                <button
                  type="button"
                  onClick={handleAddActionRow}
                  className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Ajouter une action</span>
                </button>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-800 text-white text-[11px] font-bold">
                      <th className="py-2 px-3">Action à réaliser</th>
                      <th className="py-2 px-3 w-44">Responsable</th>
                      <th className="py-2 px-3 w-32">Échéance</th>
                      <th className="py-2 px-2 w-10 text-center"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-xs">
                    {(report.actionPlan || []).map((row) => (
                      <tr key={row.id} className="bg-white hover:bg-slate-50">
                        <td className="p-2">
                          <input
                            type="text"
                            value={row.action || ''}
                            onChange={(e) =>
                              handleUpdateActionRow(row.id, 'action', e.target.value)
                            }
                            placeholder="Décrire la tâche à réaliser..."
                            className="w-full text-xs rounded border border-slate-200 px-2 py-1.5"
                          />
                        </td>
                        <td className="p-2">
                          <select
                            value={row.owner || 'ENR Courtage'}
                            onChange={(e) =>
                              handleUpdateActionRow(row.id, 'owner', e.target.value)
                            }
                            className="w-full text-xs font-semibold rounded border border-slate-200 px-2 py-1.5 bg-white"
                          >
                            <option value="ENR Courtage">ENR Courtage</option>
                            <option value="Client">Client</option>
                            <option value="Partenaire">Partenaire</option>
                            <option value="ENR Courtage & Client">ENR Courtage & Client</option>
                          </select>
                        </td>
                        <td className="p-2">
                          <input
                            type="text"
                            value={row.dueDate || ''}
                            onChange={(e) =>
                              handleUpdateActionRow(row.id, 'dueDate', e.target.value)
                            }
                            placeholder="JJ/MM/AAAA"
                            className="w-full text-xs rounded border border-slate-200 px-2 py-1.5"
                          />
                        </td>
                        <td className="p-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleDeleteActionRow(row.id)}
                            className="text-slate-400 hover:text-red-600 p-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* SECTION 6 — Option d'inclusion de l'annexe de transcription horodatée */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-200">
              <label className="flex items-center gap-2.5 text-xs font-bold text-slate-800 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={Boolean(report.includeTranscriptInPdf)}
                  onChange={(e) =>
                    setReport((prev) => ({ ...prev, includeTranscriptInPdf: e.target.checked }))
                  }
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                />
                <span>
                  Section 6 — Inclure l'annexe de transcription horodatée à la fin du PDF (
                  {transcriptEntries.length} intervention(s))
                </span>
              </label>

              {/* Boutons principaux d'export PDF & Push Monday */}
              <div className="flex items-center gap-2.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => handlePushToMonday(report)}
                  disabled={Boolean(pushingMondayId)}
                  className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold flex items-center gap-2 shadow-md transition-all cursor-pointer disabled:opacity-50"
                >
                  <MessageSquarePlus className="w-4 h-4" />
                  <span>📌 Pousser dans Monday (MAJ)</span>
                </button>

                <button
                  type="button"
                  onClick={() => exportMeetingReportToPDF(report, transcriptEntries)}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-extrabold flex items-center gap-2 shadow-lg shadow-blue-600/25 transition-all cursor-pointer"
                >
                  <FileText className="w-4 h-4" />
                  <span>📄 Exporter le Compte-Rendu en PDF (A4)</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ═══ COLONNE DROITE (4/12) : HISTORIQUE DES RÉUNIONS & ENREGISTREMENTS ═ */}
        <div className="xl:col-span-4 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-black text-slate-900">
                  🗂️ Historique des Réunions & Enregistrements
                </h3>
                <p className="text-[11px] text-slate-500">
                  Archives locales (IndexedDB) avec piste audio, export PDF 1-clic et envoi Monday.
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-800 text-xs font-extrabold">
                {meetingsHistory.length}
              </span>
            </div>

            {meetingsHistory.length === 0 ? (
              <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-xl space-y-2">
                <Mic className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-xs font-bold text-slate-600">Aucun enregistrement archivé</p>
                <p className="text-[11px] text-slate-400">
                  Lancez un enregistrement Téléphone ou Microsoft Teams, ou importez un fichier audio pour créer votre premier compte-rendu.
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[750px] overflow-y-auto pr-1">
                {meetingsHistory.map((item) => {
                  const rep = item.report || {};
                  const isTeamsItem =
                    item.mode === 'teams' ||
                    String(rep.channel || '').toLowerCase().includes('teams');
                  const audioUrl = historyAudioUrls[item.id];
                  const isActiveItem = currentMeetingId === item.id;

                  return (
                    <div
                      key={item.id}
                      className={`p-3.5 rounded-xl border transition-all space-y-2.5 ${
                        isActiveItem
                          ? 'bg-indigo-50/50 border-indigo-400 ring-1 ring-indigo-300'
                          : 'bg-slate-50/70 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div
                          onClick={() => handleLoadMeetingFromHistory(item)}
                          className="cursor-pointer flex-1 min-w-0"
                        >
                          <div className="flex items-center gap-1.5 flex-wrap mb-1">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                                isTeamsItem
                                  ? 'bg-indigo-100 text-indigo-800'
                                  : item.mode === 'import'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-blue-100 text-blue-800'
                              }`}
                            >
                              {isTeamsItem ? '💻 Teams / Visio' : item.mode === 'import' ? '📂 Audio Importé' : '📞 Téléphone'}
                            </span>
                            <span className="text-[10px] font-mono font-bold text-slate-500">
                              ⏱ {item.duration || rep.duration || '00:00:00'}
                            </span>
                            {rep.linkedRowTitle && (
                              <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold truncate max-w-[160px]">
                                🔗 {rep.linkedRowTitle}
                              </span>
                            )}
                          </div>
                          <h4 className="text-xs font-extrabold text-slate-900 truncate">
                            {rep.title || 'Réunion sans titre'}
                          </h4>
                          <p className="text-[11px] text-slate-500">
                            {rep.dateTime || new Date(item.createdAt).toLocaleString('fr-FR')}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDeleteHistoryItem(item.id)}
                          className="p-1 text-slate-400 hover:text-red-600 rounded"
                          title="Supprimer cet enregistrement"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Lecteur audio intégré */}
                      {audioUrl && (
                        <div className="pt-1">
                          <audio controls src={audioUrl} className="w-full h-8" />
                        </div>
                      )}

                      {/* Boutons d'actions rapides : Audio / PDF / Pousser dans Monday */}
                      <div className="flex items-center gap-1.5 flex-wrap pt-1">
                        {item.audioBlob && (
                          <button
                            type="button"
                            onClick={() =>
                              handleDownloadAudio(
                                item.audioBlob,
                                rep.linkedRowTitle || rep.title,
                                item.createdAt,
                                item.mimeType
                              )
                            }
                            className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                          >
                            <Download className="w-3 h-3 text-indigo-600" />
                            <span>📥 Audio</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() =>
                            exportMeetingReportToPDF(rep, item.transcriptEntries || [])
                          }
                          className="px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <FileText className="w-3 h-3" />
                          <span>📄 PDF</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handlePushToMonday(rep)}
                          className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer ml-auto"
                          title="Ajouter automatiquement le compte-rendu dans la colonne MAJ du dossier Monday rattaché"
                        >
                          <Send className="w-3 h-3" />
                          <span>📌 Pousser dans Monday</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
