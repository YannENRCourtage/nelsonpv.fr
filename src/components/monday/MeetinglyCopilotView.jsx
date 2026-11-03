import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Mic,
  PhoneCall,
  Monitor,
  Play,
  Pause,
  Square,
  Download,
  FileText,
  Sparkles,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Users,
  Send,
  Volume2,
  FolderOpen,
  MessageSquarePlus,
  Bot,
  Paperclip,
  Mail,
  UserCheck,
  Building2,
  Briefcase,
  ChevronDown,
  ChevronUp,
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
  extractTextFromUploadedFile,
  askNelsonMeetingAI,
} from '@/services/MeetingAudioRecorderService.js';

export default function MeetinglyCopilotView({ tabs = [] }) {
  const { user } = useAuth();

  // Nom de l'utilisateur connecté à NELSON (ex: Yann)
  const connectedUserName = useMemo(() => {
    return user?.displayName || user?.firstName || user?.name || 'Yann';
  }, [user]);

  // ── 1. INTERLOCUTEURS SIMPLIFIÉS (1er = Utilisateur connecté à NELSON) ────
  const [participants, setParticipants] = useState(() => [
    {
      id: 'p-1',
      name: user?.displayName || user?.firstName || user?.name || 'Yann',
      company: 'ENR COURTAGE',
      role: user?.role || 'Dirigeant',
      isSelf: true,
    },
    {
      id: 'p-2',
      name: '',
      company: '',
      role: '',
      isSelf: false,
    },
  ]);

  // Mettre à jour le 1er interlocuteur si `user` charge de manière asynchrone
  useEffect(() => {
    if (!connectedUserName) return;
    setParticipants((prev) =>
      prev.map((p, idx) =>
        idx === 0 && (!p.name || p.name === 'Yann')
          ? { ...p, name: connectedUserName }
          : p
      )
    );
  }, [connectedUserName]);

  const handleUpdateParticipant = (id, field, value) => {
    setParticipants((prev) =>
      prev.map((p) => (p.id === id ? { ...p, [field]: value } : p))
    );
  };

  const handleAddParticipant = () => {
    setParticipants((prev) => [
      ...prev,
      {
        id: `p-${Date.now()}`,
        name: '',
        company: '',
        role: '',
        isSelf: false,
      },
    ]);
  };

  const handleRemoveParticipant = (id) => {
    setParticipants((prev) => prev.filter((p, idx) => idx === 0 || p.id !== id));
  };

  // Liste des étiquettes d'intervenants pour la transcription en direct
  const speakerOptions = useMemo(() => {
    return participants.map((p, idx) => {
      const baseName = (p.name || '').trim() || (idx === 0 ? connectedUserName : `Interlocuteur ${idx + 1}`);
      const comp = (p.company || '').trim();
      return {
        id: p.id,
        label: comp ? `${baseName} (${comp})` : baseName,
        shortName: baseName,
      };
    });
  }, [participants, connectedUserName]);

  // ── 2. RATTACHEMENT OPTIONNEL AUX TABLEAUX MONDAY ("Projets" & "LEADS") ───
  const targetTabs = useMemo(() => {
    return (tabs || []).filter((t) => {
      const n = (t.name || '').toLowerCase();
      return n.includes('projet') || n.includes('lead');
    });
  }, [tabs]);

  const [mondayRowsByTab, setMondayRowsByTab] = useState({});
  const [selectedLinkedKey, setSelectedLinkedKey] = useState('');

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

  const selectedLinkedRow = useMemo(() => {
    return allLinkableRows.find((r) => r.key === selectedLinkedKey) || null;
  }, [allLinkableRows, selectedLinkedKey]);

  // ── 3. ÉTAT DE L'ENREGISTREUR AUDIO & GRANDE VISIONNEUSE DE TRANSCRIPTION ──
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
  const [activeSpeakerIndex, setActiveSpeakerIndex] = useState(0);
  const [quickNoteInput, setQuickNoteInput] = useState('');
  const [quickNotes, setQuickNotes] = useState([]);

  const recorderServiceRef = useRef(null);
  const timerIntervalRef = useRef(null);
  const elapsedSecondsRef = useRef(0);
  const activeSpeakerLabelRef = useRef('');
  const recordingStateRef = useRef('idle');
  const speechRecognitionRef = useRef(null);
  const waveformCanvasRef = useRef(null);
  const animFrameRef = useRef(null);
  const importAudioInputRef = useRef(null);
  const transcriptEndRef = useRef(null);

  const currentSpeakerLabel =
    speakerOptions[activeSpeakerIndex]?.label ||
    speakerOptions[0]?.label ||
    `${connectedUserName} (ENR COURTAGE)`;

  useEffect(() => {
    activeSpeakerLabelRef.current = currentSpeakerLabel;
  }, [currentSpeakerLabel]);

  useEffect(() => {
    recordingStateRef.current = recordingState;
  }, [recordingState]);

  // Auto-scroll de la visionneuse de transcription
  useEffect(() => {
    if (transcriptEndRef.current) {
      transcriptEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [transcriptEntries, interimTranscript]);

  const showToast = useCallback((msg, type = 'success') => {
    setToastBanner({ msg, type });
    setTimeout(() => {
      setToastBanner((prev) => (prev?.msg === msg ? null : prev));
    }, 4500);
  }, []);

  // ── 4. ÉTAT DU COPILOTE IA NELSON (DOCUMENTS, MAILS & QUESTIONS EN DIRECT) ─
  const [contextText, setContextText] = useState('');
  const [uploadedDocs, setUploadedDocs] = useState([]); // [{ id, name, size, extractedText }]
  const [aiMessages, setAiMessages] = useState([
    {
      id: 'welcome-ai',
      role: 'assistant',
      timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      content:
        "Bonjour ! Je suis l'IA Copilote NELSON. Vous pouvez me fournir vos documents, contrats ou mails reçus avant ou pendant l'appel, et me poser toutes vos questions en direct sur la conversation en cours.",
    },
  ]);
  const [aiQuestionInput, setAiQuestionInput] = useState('');
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [showContextPanel, setShowContextPanel] = useState(true);
  const docInputRef = useRef(null);
  const aiChatEndRef = useRef(null);

  useEffect(() => {
    if (aiChatEndRef.current) {
      aiChatEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [aiMessages, isAiThinking]);

  const handleUploadContextDocs = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    e.target.value = '';

    const newDocs = [];
    for (const file of files) {
      const extractedText = await extractTextFromUploadedFile(file);
      newDocs.push({
        id: `doc_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        name: file.name,
        size: file.size,
        extractedText,
      });
    }

    setUploadedDocs((prev) => [...prev, ...newDocs]);
    showToast(
      `${newDocs.length} document(s) analysé(s) et intégré(s) au contexte de l'IA NELSON !`
    );
  };

  const handleAskNelsonAI = async (customPrompt = null) => {
    const questionText = (customPrompt !== null ? customPrompt : aiQuestionInput).trim();
    if (!questionText || isAiThinking) return;

    if (customPrompt === null) {
      setAiQuestionInput('');
    }

    const userMsg = {
      id: `usr_${Date.now()}`,
      role: 'user',
      timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      content: questionText,
    };
    setAiMessages((prev) => [...prev, userMsg]);
    setIsAiThinking(true);

    try {
      const answer = await askNelsonMeetingAI({
        question: questionText,
        participants,
        transcriptEntries,
        contextText,
        uploadedDocs,
        linkedRow: selectedLinkedRow,
      });

      setAiMessages((prev) => [
        ...prev,
        {
          id: `ai_${Date.now()}`,
          role: 'assistant',
          timestamp: new Date().toLocaleTimeString('fr-FR', {
            hour: '2-digit',
            minute: '2-digit',
          }),
          content: answer,
        },
      ]);
    } catch (err) {
      setAiMessages((prev) => [
        ...prev,
        {
          id: `ai_err_${Date.now()}`,
          role: 'assistant',
          timestamp: new Date().toLocaleTimeString('fr-FR', {
            hour: '2-digit',
            minute: '2-digit',
          }),
          content: "Une erreur est survenue lors de l'analyse. Veuillez réessayer.",
        },
      ]);
    } finally {
      setIsAiThinking(false);
    }
  };

  // ── 5. COMPTE-RENDU AUTOMATIQUE BASÉ SUR LES INTERLOCUTEURS & LA CONVERSATION
  const buildCurrentReportObject = useCallback(
    (customDuration = null) => {
      const formattedParticipants = participants
        .filter((p) => (p.name || '').trim() || (p.company || '').trim())
        .map((p) => {
          const n = (p.name || '').trim() || 'Interlocuteur';
          const c = (p.company || '').trim();
          const r = (p.role || '').trim();
          if (c && r) return `${n} (${c} — ${r})`;
          if (c) return `${n} (${c})`;
          if (r) return `${n} (${r})`;
          return n;
        })
        .join(', ');

      const secondSpeaker = participants[1] || {};
      const otherTitle =
        secondSpeaker.company?.trim() ||
        secondSpeaker.name?.trim() ||
        selectedLinkedRow?.title ||
        'Interlocuteur';

      const autoTitle = `Réunion ${participants[0]?.company || 'ENR COURTAGE'} x ${otherTitle}`;

      return buildStructuredMeetingReport({
        transcriptEntries,
        quickNotes: [
          ...quickNotes,
          ...(contextText.trim()
            ? [{ timestamp: 'Contexte', text: contextText.trim().slice(0, 300) }]
            : []),
        ],
        meta: {
          mode: recordMode,
          title: autoTitle,
          clientName: otherTitle,
          dateTime: new Date().toLocaleString('fr-FR', {
            dateStyle: 'short',
            timeStyle: 'short',
          }),
          duration: customDuration || formatDurationHms(elapsedSecondsRef.current || elapsedSeconds),
          participants: formattedParticipants,
          statusPriority: 'Suivi Actif',
          includeTranscriptInPdf: true,
        },
        linkedRow: selectedLinkedRow,
      });
    },
    [participants, transcriptEntries, quickNotes, contextText, recordMode, elapsedSeconds, selectedLinkedRow]
  );

  // ── 6. HISTORIQUE DES RÉUNIONS (INDEXEDDB) ───────────────────────────────
  const [meetingsHistory, setMeetingsHistory] = useState([]);
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

  const forceRefreshAudioPermissionsCache = useCallback(async () => {
    try {
      if ('caches' in window) {
        const keys = await window.caches.keys();
        await Promise.all(keys.map((k) => window.caches.delete(k)));
      }
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.update()));
      }
    } catch (_) {}
    const url = new URL(window.location.href);
    url.searchParams.set('mic_refresh', String(Date.now()));
    window.location.replace(url.toString());
  }, []);

  useEffect(() => {
    loadHistory();

    // Si le document HTML en cache possède encore l'ancien en-tête Permissions-Policy: microphone=(),
    // on purge automatiquement le cache Service Worker une fois pour récupérer le nouvel en-tête Vercel.
    try {
      const policyObj = document.permissionsPolicy || document.featurePolicy;
      const isPolicyBlocked =
        policyObj && typeof policyObj.allowsFeature === 'function'
          ? !policyObj.allowsFeature('microphone')
          : false;
      if (isPolicyBlocked && !sessionStorage.getItem('nelson_mic_policy_refreshed_v2')) {
        sessionStorage.setItem('nelson_mic_policy_refreshed_v2', '1');
        forceRefreshAudioPermissionsCache();
      }
    } catch (_) {}

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
  }, [loadHistory, forceRefreshAudioPermissionsCache]);

  // ── 7. VISUALISEUR D'ONDE (WAVEFORM SUR CANVAS) ──────────────────────────
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

      if (recordingStateRef.current === 'paused') {
        ctx.fillStyle = '#94a3b8';
        ctx.font = 'bold 12px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('⏸️ ENREGISTREMENT EN PAUSE', W / 2, H / 2 + 4);
        return;
      }

      analyser.getByteFrequencyData(freqData);
      analyser.getByteTimeDomainData(timeData);

      const barCount = 48;
      const step = Math.max(1, Math.floor(bufferLength / barCount));
      const barW = (W / barCount) * 0.68;
      const gap = (W / barCount) * 0.32;

      for (let i = 0; i < barCount; i++) {
        const val = freqData[i * step] || 0;
        const norm = val / 255;
        const barH = Math.max(4, norm * (H - 10));
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
    }
  }, []);

  // ── 8. TRANSCRIPTION CONTINUE EN DIRECT (FR-FR) ──────────────────────────
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
                  speaker: activeSpeakerLabelRef.current,
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

  // ── 9. DÉMARRER / PAUSE / ARRÊTER L'ENREGISTREMENT ───────────────────────
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

  const handleStopRecording = async () => {
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

    const generatedReport = buildCurrentReportObject(finalDurationStr);
    const meetingId = currentMeetingId || `mtg_${Date.now()}`;
    setCurrentMeetingId(meetingId);

    try {
      await saveMeetingToIndexedDB({
        id: meetingId,
        createdAt: new Date().toISOString(),
        mode: recordMode,
        duration: finalDurationStr,
        mimeType: recordedMime,
        audioBlob: recordedBlob,
        participants,
        contextText,
        uploadedDocs,
        report: generatedReport,
        transcriptEntries,
        quickNotes,
      });
      await loadHistory();
      showToast('Enregistrement terminé et sauvegardé dans vos archives !');
    } catch (err) {
      console.warn('[Meetingly] Sauvegarde IndexedDB:', err);
    }
  };

  // ── 10. IMPORT AUDIO EXTERNE & EXPORT PDF / AUDIO / MONDAY ───────────────
  const handleImportAudioFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    const url = URL.createObjectURL(file);
    const durationSec = await new Promise((resolve) => {
      const tempAudio = document.createElement('audio');
      tempAudio.preload = 'metadata';
      tempAudio.onloadedmetadata = () => {
        resolve(tempAudio.duration && isFinite(tempAudio.duration) ? Math.round(tempAudio.duration) : 0);
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

    const generatedReport = buildCurrentReportObject(durStr);
    const meetingId = `mtg_imp_${Date.now()}`;
    setCurrentMeetingId(meetingId);

    await saveMeetingToIndexedDB({
      id: meetingId,
      createdAt: new Date().toISOString(),
      mode: 'import',
      duration: durStr,
      mimeType: file.type || 'audio/mpeg',
      audioBlob: file,
      participants,
      contextText,
      uploadedDocs,
      report: generatedReport,
      transcriptEntries,
      quickNotes,
    });
    await loadHistory();
    showToast(`Fichier audio « ${file.name} » importé !`);
  };

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

  const handleExportCurrentPDF = () => {
    const rep = buildCurrentReportObject();
    exportMeetingReportToPDF(rep, transcriptEntries);
  };

  const handlePushToMonday = async (customReport = null) => {
    const targetReport = customReport || buildCurrentReportObject();
    const tableId = targetReport.linkedTableId || selectedLinkedRow?.tableId;
    const rowId = targetReport.linkedRowId || selectedLinkedRow?.rowId;

    if (!tableId || !rowId) {
      setErrorMessage(
        'Sélectionnez un dossier Monday (Projets / LEADS) dans la barre ci-dessus pour y pousser le compte-rendu.'
      );
      return;
    }

    setPushingMondayId(rowId);
    setErrorMessage(null);

    try {
      const tabRows = mondayRowsByTab[tableId] || [];
      const targetRow = tabRows.find((r) => r.id === rowId);
      if (!targetRow) throw new Error('Ligne Monday introuvable.');

      const authorName = connectedUserName;
      const authorAvatar = user?.photoURL || user?.avatar || '/avatars/yann.jpg';
      const authorRole = user?.role || 'ENR COURTAGE — Meetingly IA';

      const updateText = [
        `🎙️ COMPTE-RENDU DE RÉUNION (${targetReport.channel || 'Appel / Visio'})`,
        `📌 Objet : ${targetReport.title}`,
        `📅 Date : ${targetReport.dateTime} • Durée : ${targetReport.duration}`,
        `👥 Interlocuteurs : ${targetReport.participants}`,
        ``,
        `🔹 SYNTHÈSE :`,
        `${targetReport.executiveSummary}`,
        ``,
        `🔹 POINTS ABORDÉS :`,
        `${targetReport.keyPointsText}`,
      ].join('\n');

      const existingUpdates = Array.isArray(targetRow.data?.__updates)
        ? targetRow.data.__updates
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

      await apiService.updateMondayRow(tableId, rowId, {
        data: {
          ...(targetRow.data || {}),
          __updates: [newUpdateObj, ...existingUpdates],
        },
      });

      showToast(`Compte-rendu ajouté dans la colonne MAJ de « ${targetRow.title} » !`);
    } catch (err) {
      setErrorMessage(err?.message || "Erreur lors de l'envoi dans Monday.");
    } finally {
      setPushingMondayId(null);
    }
  };

  const handleAddManualTranscriptLine = (e) => {
    if (e) e.preventDefault();
    if (!quickNoteInput.trim()) return;
    const stamp = formatDurationHms(elapsedSeconds);
    const entry = {
      id: `tr_manual_${Date.now()}`,
      timestamp: stamp,
      speaker: currentSpeakerLabel,
      text: quickNoteInput.trim(),
    };
    setTranscriptEntries((prev) => [...prev, entry]);
    setQuickNotes((prev) => [...prev, { id: entry.id, timestamp: stamp, text: quickNoteInput.trim() }]);
    setQuickNoteInput('');
  };

  const handleLoadHistoryItem = (item) => {
    setCurrentMeetingId(item.id);
    if (Array.isArray(item.participants) && item.participants.length > 0) {
      setParticipants(item.participants);
    }
    if (typeof item.contextText === 'string') {
      setContextText(item.contextText);
    }
    if (Array.isArray(item.uploadedDocs)) {
      setUploadedDocs(item.uploadedDocs);
    }
    setTranscriptEntries(item.transcriptEntries || []);
    setQuickNotes(item.quickNotes || []);
    if (item.audioBlob instanceof Blob) {
      setCurrentAudioBlob(item.audioBlob);
      setCurrentAudioUrl(historyAudioUrls[item.id] || URL.createObjectURL(item.audioBlob));
      setCurrentAudioMime(item.mimeType || 'audio/webm');
    }
    showToast(`Échange « ${item.report?.title || 'Réunion'} » rechargé.`);
  };

  const handleDeleteHistoryItem = async (id) => {
    await deleteMeetingFromIndexedDB(id);
    if (currentMeetingId === id) setCurrentMeetingId(null);
    await loadHistory();
  };

  return (
    <div className="space-y-6 pb-12">
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
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-semibold flex flex-wrap items-center justify-between gap-3 shadow-sm">
          <div className="flex items-start gap-2.5 flex-1 min-w-[240px]">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <div className="flex-1">{errorMessage}</div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={forceRefreshAudioPermissionsCache}
              className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-[11px] font-bold shadow-sm transition-colors"
            >
              🔄 Réinitialiser & Activer le micro
            </button>
            <button onClick={() => setErrorMessage(null)} className="text-red-800 font-bold text-[11px] px-1">
              ✕
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* ═══ COLONNE PRINCIPALE GAUCHE (8/12) ═══════════════════════════════ */}
        <div className="xl:col-span-8 space-y-6">
          {/* ── CARTE 1 : INTERLOCUTEURS + ENREGISTREMENT & GRANDE VISIONNEUSE ── */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-5">
            {/* En-tête compact avec export PDF et import audio */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <Mic className="w-5 h-5 text-indigo-600" />
                  <span>Meetingly IA — Enregistrement & Retranscription en Direct</span>
                </h2>
                <p className="text-xs text-slate-500">
                  Indiquez vos interlocuteurs puis cliquez sur Enregistrer pour démarrer la retranscription en direct.
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
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
                  className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <FolderOpen className="w-3.5 h-3.5 text-amber-600" />
                  <span>Importer audio</span>
                </button>

                <button
                  type="button"
                  onClick={handleExportCurrentPDF}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-extrabold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>📄 Exporter Compte-Rendu PDF</span>
                </button>
              </div>
            </div>

            {/* 1. LISTE DES INTERLOCUTEURS (1er = Utilisateur connecté à NELSON) */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-indigo-600" />
                  <span>Interlocuteurs de la conversation</span>
                </label>
                <button
                  type="button"
                  onClick={handleAddParticipant}
                  className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Ajouter un interlocuteur</span>
                </button>
              </div>

              <div className="space-y-2">
                {participants.map((p, idx) => (
                  <div
                    key={p.id}
                    className={`grid grid-cols-1 sm:grid-cols-12 gap-2 items-center p-2.5 rounded-xl border ${
                      idx === 0
                        ? 'bg-indigo-50/50 border-indigo-200'
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="sm:col-span-4">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-extrabold shrink-0 ${
                            idx === 0
                              ? 'bg-indigo-600 text-white'
                              : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          {idx === 0 ? 'Vous (NELSON)' : `Interlocuteur ${idx + 1}`}
                        </span>
                        <input
                          type="text"
                          value={p.name}
                          onChange={(e) =>
                            handleUpdateParticipant(p.id, 'name', e.target.value)
                          }
                          placeholder="Nom & Prénom..."
                          className="w-full text-xs font-bold rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                      </div>
                    </div>

                    <div className="sm:col-span-4">
                      <div className="relative flex items-center">
                        <Building2 className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 pointer-events-none" />
                        <input
                          type="text"
                          value={p.company}
                          onChange={(e) =>
                            handleUpdateParticipant(p.id, 'company', e.target.value)
                          }
                          placeholder="Entreprise (ex: SOLAIME, Mairie, Client...)"
                          className="w-full text-xs font-semibold rounded-lg border border-slate-300 bg-white pl-8 pr-2.5 py-1.5 focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                      </div>
                    </div>

                    <div className="sm:col-span-3">
                      <div className="relative flex items-center">
                        <Briefcase className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 pointer-events-none" />
                        <input
                          type="text"
                          value={p.role}
                          onChange={(e) =>
                            handleUpdateParticipant(p.id, 'role', e.target.value)
                          }
                          placeholder="Poste (optionnel)"
                          className="w-full text-xs rounded-lg border border-slate-300 bg-white pl-8 pr-2.5 py-1.5 focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                      </div>
                    </div>

                    <div className="sm:col-span-1 flex justify-end">
                      {idx > 0 ? (
                        <button
                          type="button"
                          onClick={() => handleRemoveParticipant(p.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50"
                          title="Retirer cet interlocuteur"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      ) : (
                        <UserCheck className="w-4 h-4 text-indigo-600 mr-1.5" title="Utilisateur connecté" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 2. BARRE DE COMMANDE D'ENREGISTREMENT (1 CLIC) */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-slate-900 text-white p-3.5 rounded-2xl border border-slate-800 shadow-inner">
              <div className="flex items-center gap-2 flex-wrap">
                {recordingState === 'idle' ? (
                  <button
                    type="button"
                    onClick={handleStartRecording}
                    className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-black flex items-center gap-2.5 shadow-lg shadow-red-600/30 transition-all cursor-pointer"
                  >
                    <span className="w-3 h-3 rounded-full bg-white animate-pulse" />
                    <span>⏺️ Enregistrer</span>
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={handleTogglePause}
                      className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-extrabold flex items-center gap-1.5 cursor-pointer"
                    >
                      {recordingState === 'paused' ? (
                        <>
                          <Play className="w-4 h-4" />
                          <span>Reprendre</span>
                        </>
                      ) : (
                        <>
                          <Pause className="w-4 h-4" />
                          <span>Pause</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={handleStopRecording}
                      className="px-4 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-900 text-xs font-extrabold flex items-center gap-1.5 cursor-pointer"
                    >
                      <Square className="w-4 h-4 text-red-600 fill-red-600" />
                      <span>⏹️ Arrêter & Sauvegarder</span>
                    </button>
                  </>
                )}

                {/* Sélecteur compact Téléphone vs Teams/Visio */}
                <div className="flex items-center bg-slate-800 p-1 rounded-xl border border-slate-700">
                  <button
                    type="button"
                    disabled={recordingState !== 'idle'}
                    onClick={() => setRecordMode('phone')}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                      recordMode === 'phone'
                        ? 'bg-blue-600 text-white shadow'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    <PhoneCall className="w-3.5 h-3.5" />
                    <span>Téléphone / Micro</span>
                  </button>
                  <button
                    type="button"
                    disabled={recordingState !== 'idle'}
                    onClick={() => setRecordMode('teams')}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                      recordMode === 'teams'
                        ? 'bg-indigo-600 text-white shadow'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    <Monitor className="w-3.5 h-3.5" />
                    <span>Teams / Meet / Zoom</span>
                  </button>
                </div>
              </div>

              {/* Spectre Audio compact + Chronomètre */}
              <div className="flex items-center gap-3">
                <canvas
                  ref={waveformCanvasRef}
                  width={220}
                  height={40}
                  className="w-36 sm:w-48 h-10 rounded-lg bg-slate-950 border border-slate-800"
                />
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 font-mono text-base font-black tracking-wider">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      recordingState === 'recording'
                        ? 'bg-red-500 animate-ping'
                        : recordingState === 'paused'
                        ? 'bg-amber-400'
                        : 'bg-slate-600'
                    }`}
                  />
                  <span>{formatDurationHms(elapsedSeconds)}</span>
                </div>
              </div>
            </div>

            {/* Lecteur audio si un enregistrement vient d'être terminé */}
            {currentAudioUrl && (
              <div className="flex items-center gap-3 bg-slate-100 px-3.5 py-2 rounded-xl border border-slate-200 flex-wrap">
                <Volume2 className="w-4 h-4 text-indigo-600 shrink-0" />
                <audio controls src={currentAudioUrl} className="h-8 flex-1 min-w-[220px]" />
                {currentAudioBlob && (
                  <button
                    type="button"
                    onClick={() =>
                      handleDownloadAudio(
                        currentAudioBlob,
                        participants[1]?.company || participants[1]?.name || 'Reunion',
                        new Date().toISOString(),
                        currentAudioMime
                      )
                    }
                    className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Télécharger l'audio</span>
                  </button>
                )}
              </div>
            )}

            {/* 3. GRANDE VISIONNEUSE DE RETRANSCRIPTION EN DIRECT */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-slate-900 uppercase tracking-wide">
                    💬 Retranscription en direct de la conversation
                  </span>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-bold">
                    {transcriptEntries.length} intervention(s)
                  </span>
                </div>

                {/* Boutons pour basculer l'interlocuteur qui parle */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px] text-slate-500 font-semibold">Qui parle :</span>
                  {speakerOptions.map((spk, idx) => (
                    <button
                      key={spk.id}
                      type="button"
                      onClick={() => setActiveSpeakerIndex(idx)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        activeSpeakerIndex === idx
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {spk.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Grande fenêtre de transcription (h-80 = 320px) */}
              <div className="h-80 overflow-y-auto bg-slate-950 text-slate-100 rounded-2xl border border-slate-800 p-4 space-y-3 shadow-inner">
                {transcriptEntries.length === 0 && !interimTranscript ? (
                  <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 space-y-2">
                    <Mic className="w-8 h-8 text-slate-600" />
                    <p className="text-sm font-bold text-slate-300">
                      La retranscription en direct s'affichera ici dès que vous cliquez sur « Enregistrer »
                    </p>
                    <p className="text-xs text-slate-500 max-w-md">
                      Vous pouvez également saisir ou compléter des notes directement dans la barre ci-dessous pendant l'échange.
                    </p>
                  </div>
                ) : (
                  transcriptEntries.map((item) => {
                    const isSelfSpeaker =
                      item.speaker.toLowerCase().includes((connectedUserName || 'yann').toLowerCase()) ||
                      item.speaker.toLowerCase().includes('enr courtage');
                    return (
                      <div
                        key={item.id}
                        className={`flex flex-col rounded-xl p-3 border ${
                          isSelfSpeaker
                            ? 'bg-indigo-950/60 border-indigo-500/30 ml-0 mr-8'
                            : 'bg-slate-900/90 border-slate-700/70 ml-8 mr-0'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[11px] font-bold text-indigo-400 bg-indigo-950 px-1.5 py-0.5 rounded">
                              {item.timestamp}
                            </span>
                            <span
                              className={`text-xs font-extrabold ${
                                isSelfSpeaker ? 'text-indigo-300' : 'text-emerald-300'
                              }`}
                            >
                              {item.speaker}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              setTranscriptEntries((prev) =>
                                prev.filter((x) => x.id !== item.id)
                              )
                            }
                            className="text-slate-500 hover:text-red-400 text-xs"
                            title="Supprimer cette ligne"
                          >
                            ✕
                          </button>
                        </div>
                        <p className="text-sm text-slate-100 leading-relaxed">{item.text}</p>
                      </div>
                    );
                  })
                )}

                {interimTranscript && (
                  <div className="rounded-xl p-3 bg-indigo-900/30 border border-indigo-500/40 text-sm text-indigo-200 italic animate-pulse">
                    <span className="font-mono text-xs font-bold mr-2">
                      [{formatDurationHms(elapsedSeconds)}]
                    </span>
                    <span className="font-bold mr-1">{currentSpeakerLabel} :</span>
                    <span>{interimTranscript}...</span>
                  </div>
                )}
                <div ref={transcriptEndRef} />
              </div>

              {/* Barre d'ajout manuel de phrase / note dans la retranscription */}
              <form onSubmit={handleAddManualTranscriptLine} className="flex items-center gap-2">
                <input
                  type="text"
                  value={quickNoteInput}
                  onChange={(e) => setQuickNoteInput(e.target.value)}
                  placeholder={`Ajouter une note ou parole pour ${currentSpeakerLabel}...`}
                  className="flex-1 text-xs rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2.5 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                />
                <button
                  type="submit"
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold flex items-center gap-1.5 shrink-0 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Ajouter à la transcription</span>
                </button>
              </form>
            </div>
          </div>

          {/* ── CARTE 2 : GRAND CADRE COPILOTE IA NELSON (QUESTIONS + DOCUMENTS & MAILS) ── */}
          <div className="bg-white rounded-2xl border-2 border-indigo-500/30 shadow-md overflow-hidden">
            {/* Bandeau du Copilote IA */}
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 px-5 py-4 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600/30 border border-indigo-400/40 flex items-center justify-center text-indigo-300 shrink-0">
                  <Bot className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-black tracking-tight flex items-center gap-2">
                    <span>Copilote IA NELSON — Assistant de Conversation en Direct</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                      Connecté à la transcription & aux documents
                    </span>
                  </h3>
                  <p className="text-xs text-slate-300">
                    Fournissez vos documents, contrats ou mails reçus avant ou pendant l'appel, et posez vos questions en direct à l'IA.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowContextPanel((prev) => !prev)}
                className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
              >
                <Paperclip className="w-3.5 h-3.5 text-indigo-300" />
                <span>
                  Contexte & Pièces ({uploadedDocs.length} doc{uploadedDocs.length > 1 ? 's' : ''})
                </span>
                {showContextPanel ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </button>
            </div>

            <div className="p-5 space-y-5">
              {/* VOLET 1 : DOCUMENTS, MAILS REÇUS & TEXTES FOURNIS À L'IA (AVANT OU PENDANT L'APPEL) */}
              {showContextPanel && (
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h4 className="text-xs font-black text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                        <Mail className="w-4 h-4 text-indigo-600" />
                        <span>
                          1. Documents, Mails reçus & Textes de contexte (avant ou pendant la conversation)
                        </span>
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Collez ici les mails reçus, propositions ou clauses, ou importez vos fichiers (.pdf, .docx, .xlsx, .txt, .eml).
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        ref={docInputRef}
                        type="file"
                        multiple
                        accept=".pdf,.txt,.csv,.json,.md,.docx,.xlsx,.xls,.eml,.html"
                        onChange={handleUploadContextDocs}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => docInputRef.current?.click()}
                        className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-extrabold flex items-center gap-1.5 shadow-sm cursor-pointer shrink-0"
                      >
                        <Paperclip className="w-3.5 h-3.5" />
                        <span>📎 Joindre des documents (.pdf, .docx, .xlsx, .txt, .eml)</span>
                      </button>
                    </div>
                  </div>

                  {/* Liste des documents joints */}
                  {uploadedDocs.length > 0 && (
                    <div className="flex items-center gap-2 flex-wrap pt-1">
                      {uploadedDocs.map((doc) => (
                        <div
                          key={doc.id}
                          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white border border-indigo-200 text-xs font-bold text-slate-800 shadow-2xs"
                        >
                          <FileText className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                          <span className="truncate max-w-[220px]">{doc.name}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-extrabold">
                            Lu par l'IA
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setUploadedDocs((prev) => prev.filter((d) => d.id !== doc.id))
                            }
                            className="text-slate-400 hover:text-red-600 ml-1"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Zone de collage de mails / textes */}
                  <textarea
                    rows={4}
                    value={contextText}
                    onChange={(e) => setContextText(e.target.value)}
                    placeholder="Collez ici les mails reçus, extraits de contrat, chiffres clés, historique client ou notes préparatoires (accessible et modifiable même pendant l'enregistrement)..."
                    className="w-full text-xs leading-relaxed rounded-xl border border-slate-300 bg-white p-3 focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              )}

              {/* VOLET 2 : GRAND CADRE DE QUESTIONS / RÉPONSES EN DIRECT AVEC L'IA DE NELSON */}
              <div className="space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="text-xs font-black text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-indigo-600" />
                    <span>2. Posez vos questions à l'IA de NELSON sur la conversation en cours</span>
                  </span>

                  {/* Questions rapides en 1 clic */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {[
                      '💡 Que répondre maintenant à mon interlocuteur ?',
                      '🔍 Vérifie la cohérence avec les mails / documents fournis',
                      '📋 Résume ce qui vient d’être dit',
                      '⚠️ Quels points de vigilance ou questions poser ?',
                      '✉️ Rédige un mail de suivi',
                    ].map((quickPrompt) => (
                      <button
                        key={quickPrompt}
                        type="button"
                        onClick={() => handleAskNelsonAI(quickPrompt)}
                        className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-[11px] font-bold transition-colors cursor-pointer"
                      >
                        {quickPrompt}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Fenêtre de réponses de l'IA (h-80 = 320px) */}
                <div className="h-80 overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
                  {aiMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex flex-col rounded-2xl p-3.5 text-xs leading-relaxed ${
                        msg.role === 'user'
                          ? 'bg-indigo-600 text-white ml-12 mr-0 self-end shadow-xs'
                          : 'bg-white text-slate-800 border border-slate-200 mr-6 ml-0 shadow-xs'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span
                          className={`font-extrabold text-[11px] ${
                            msg.role === 'user' ? 'text-indigo-100' : 'text-indigo-600'
                          }`}
                        >
                          {msg.role === 'user'
                            ? `👤 ${connectedUserName}`
                            : '🤖 IA NELSON (Copilote en direct)'}
                        </span>
                        <span
                          className={`text-[10px] font-mono ${
                            msg.role === 'user' ? 'text-indigo-200' : 'text-slate-400'
                          }`}
                        >
                          {msg.timestamp}
                        </span>
                      </div>
                      <div className="whitespace-pre-line text-xs sm:text-[13px]">
                        {msg.content}
                      </div>
                    </div>
                  ))}

                  {isAiThinking && (
                    <div className="rounded-2xl p-3.5 bg-white border border-indigo-200 text-xs text-indigo-700 font-semibold animate-pulse">
                      🤖 L'IA de NELSON analyse la conversation en cours et vos documents...
                    </div>
                  )}
                  <div ref={aiChatEndRef} />
                </div>

                {/* Barre de saisie pour poser une question à l'IA */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleAskNelsonAI();
                  }}
                  className="flex items-center gap-2"
                >
                  <input
                    type="text"
                    value={aiQuestionInput}
                    onChange={(e) => setAiQuestionInput(e.target.value)}
                    placeholder="Posez votre question à l'IA de NELSON (ex: Que dit le contrat sur ce point ? Que lui répondre sur le tarif ? Résume ses demandes)..."
                    className="flex-1 text-xs sm:text-sm rounded-xl border-2 border-indigo-200 bg-white px-4 py-3 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none"
                  />
                  <button
                    type="submit"
                    disabled={isAiThinking}
                    className="px-5 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white text-xs sm:text-sm font-extrabold flex items-center gap-2 shadow-md transition-all cursor-pointer shrink-0 disabled:opacity-50"
                  >
                    <Send className="w-4 h-4" />
                    <span>Demander à l'IA</span>
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>

        {/* ═══ COLONNE DROITE (4/12) : RATTACHEMENT MONDAY & HISTORIQUE ════════ */}
        <div className="xl:col-span-4 space-y-4">
          {/* Rattachement rapide optionnel à un dossier Monday */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-3">
            <label className="block text-xs font-black text-slate-800">
              🔗 Rattacher à un dossier Monday (optionnel)
            </label>
            <select
              value={selectedLinkedKey}
              onChange={(e) => setSelectedLinkedKey(e.target.value)}
              className="w-full text-xs font-semibold rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              <option value="">— Aucun dossier rattaché —</option>
              {allLinkableRows.map((item) => (
                <option key={item.key} value={item.key}>
                  [{item.tableName}] {item.title}
                </option>
              ))}
            </select>
            {selectedLinkedRow && (
              <button
                type="button"
                onClick={() => handlePushToMonday()}
                disabled={Boolean(pushingMondayId)}
                className="w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold flex items-center justify-center gap-2 shadow-sm cursor-pointer disabled:opacity-50"
              >
                <MessageSquarePlus className="w-4 h-4" />
                <span>📌 Pousser le compte-rendu dans « {selectedLinkedRow.title} »</span>
              </button>
            )}
          </div>

          {/* Historique des Réunions & Enregistrements */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-black text-slate-900">
                  🗂️ Historique des Réunions
                </h3>
                <p className="text-[11px] text-slate-500">
                  Réécoutez vos appels ou téléchargez le PDF A4.
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
                  Vos conversations enregistrées apparaîtront automatiquement ici.
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[680px] overflow-y-auto pr-1">
                {meetingsHistory.map((item) => {
                  const rep = item.report || {};
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
                          onClick={() => handleLoadHistoryItem(item)}
                          className="cursor-pointer flex-1 min-w-0"
                        >
                          <div className="flex items-center gap-1.5 flex-wrap mb-1">
                            <span className="text-[10px] font-mono font-bold text-slate-500">
                              ⏱ {item.duration || rep.duration || '00:00:00'}
                            </span>
                          </div>
                          <h4 className="text-xs font-extrabold text-slate-900 truncate">
                            {rep.title || 'Réunion'}
                          </h4>
                          <p className="text-[11px] text-slate-500 truncate">
                            {rep.participants || ''}
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

                      {audioUrl && (
                        <div className="pt-1">
                          <audio controls src={audioUrl} className="w-full h-8" />
                        </div>
                      )}

                      <div className="flex items-center gap-1.5 flex-wrap pt-1">
                        {item.audioBlob && (
                          <button
                            type="button"
                            onClick={() =>
                              handleDownloadAudio(
                                item.audioBlob,
                                rep.title,
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
