import React, { useState, useEffect, useRef } from 'react';
import {
  Download,
  FolderOpen,
  FileText,
  FileSpreadsheet,
  Image as ImageIcon,
  File,
  Search,
  Trash2,
  X,
  ExternalLink,
  MoreHorizontal,
  Eye,
  CheckCircle2,
} from 'lucide-react';
import {
  getDownloadsList,
  removeDownloadEntry,
  clearAllDownloads,
  initDownloadHistoryInterceptor,
} from '@/services/downloadHistoryService';

function formatFileSize(bytes) {
  if (!bytes || bytes <= 0) return '';
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} Mo`;
}

function formatDownloadTime(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const timeStr = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  if (isToday) return `Aujourd'hui à ${timeStr}`;
  return `${d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })} à ${timeStr}`;
}

function getFileIcon(fileName = '', mimeType = '') {
  const lower = (fileName || '').toLowerCase();
  if (lower.endsWith('.pdf') || mimeType.includes('pdf')) {
    return (
      <div className="w-8 h-8 rounded-lg bg-red-50 border border-red-200 flex items-center justify-center text-red-600 shrink-0">
        <FileText className="w-4 h-4" />
      </div>
    );
  }
  if (lower.endsWith('.xlsx') || lower.endsWith('.xls') || lower.endsWith('.csv') || mimeType.includes('sheet')) {
    return (
      <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shrink-0">
        <FileSpreadsheet className="w-4 h-4" />
      </div>
    );
  }
  if (lower.endsWith('.png') || lower.endsWith('.jpg') || lower.endsWith('.jpeg') || mimeType.includes('image')) {
    return (
      <div className="w-8 h-8 rounded-lg bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-600 shrink-0">
        <ImageIcon className="w-4 h-4" />
      </div>
    );
  }
  return (
    <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shrink-0">
      <File className="w-4 h-4" />
    </div>
  );
}

export default function DownloadHistoryMenu() {
  const [downloads, setDownloads] = useState(() => getDownloadsList());
  const [showDownloadsPanel, setShowDownloadsPanel] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [recentBadge, setRecentBadge] = useState(false);
  const [previewItem, setPreviewItem] = useState(null);
  const containerRef = useRef(null);

  useEffect(() => {
    initDownloadHistoryInterceptor();
    setDownloads(getDownloadsList());

    const handleUpdate = (e) => {
      const list = e.detail?.downloads || getDownloadsList();
      setDownloads(list);
      if (e.detail?.latestDownload) {
        setRecentBadge(true);
        setShowDownloadsPanel(true);
        setShowMoreMenu(false);
      }
    };

    window.addEventListener('nelson:downloads-updated', handleUpdate);
    return () => window.removeEventListener('nelson:downloads-updated', handleUpdate);
  }, []);

  // Raccourci clavier Ctrl+J comme dans le navigateur pour ouvrir "Téléchargements"
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'j') {
        e.preventDefault();
        setShowDownloadsPanel((prev) => !prev);
        setShowMoreMenu(false);
        setRecentBadge(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Fermeture au clic extérieur
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setShowDownloadsPanel(false);
        setShowMoreMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getValidUrl = (item) => {
    if (!item) return null;
    if (item.blob instanceof Blob) {
      if (!item.objectUrl) {
        item.objectUrl = URL.createObjectURL(item.blob);
      }
      return item.objectUrl;
    }
    return item.objectUrl || item.dataUrl || null;
  };

  // Ouvrir le fichier (nouvel onglet ou visionneuse intégrée)
  const handleOpenFile = (item) => {
    const url = getValidUrl(item);
    if (!url) return;

    const isPdf = (item.fileName || '').toLowerCase().endsWith('.pdf') || (item.mimeType || '').includes('pdf');
    const win = window.open(url, '_blank', 'noopener,noreferrer');
    if (!win && isPdf) {
      setPreviewItem({ ...item, url });
    }
  };

  // Ouvrir l'explorateur Windows ("Enregistrer sous..." dans le dossier de téléchargement)
  const handleSaveToFolder = async (item) => {
    const url = getValidUrl(item);
    if (!url) return;

    if (typeof window.showSaveFilePicker === 'function' && item.blob instanceof Blob) {
      try {
        const ext = item.fileName?.includes('.') ? `.${item.fileName.split('.').pop()}` : '.pdf';
        const handle = await window.showSaveFilePicker({
          suggestedName: item.fileName || 'Document_NELSON.pdf',
          types: [
            {
              description: 'Document NELSON',
              accept: { [item.mimeType || 'application/pdf']: [ext] },
            },
          ],
        });
        const writable = await handle.createWritable();
        await writable.write(item.blob);
        await writable.close();
        return;
      } catch (err) {
        if (err?.name === 'AbortError') return;
      }
    }

    // Fallback téléchargement direct vers le dossier Téléchargements
    const a = document.createElement('a');
    a.dataset.nelsonIgnoreIntercept = 'true';
    a.href = url;
    a.download = item.fileName || 'Document_NELSON.pdf';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const filteredDownloads = downloads.filter((item) => {
    if (!searchQuery.trim()) return true;
    return (item.fileName || '').toLowerCase().includes(searchQuery.trim().toLowerCase());
  });

  return (
    <div className="relative flex items-center gap-1" ref={containerRef}>
      {/* Bouton direct "Téléchargements" dans la barre supérieure */}
      <button
        type="button"
        onClick={() => {
          setShowDownloadsPanel((prev) => !prev);
          setShowMoreMenu(false);
          setRecentBadge(false);
        }}
        className={`relative h-8 px-2.5 rounded-full flex items-center gap-1.5 text-xs font-bold border transition-all shadow-2xs cursor-pointer ${
          showDownloadsPanel
            ? 'bg-blue-600 text-white border-blue-700'
            : recentBadge
              ? 'bg-emerald-50 text-emerald-800 border-emerald-300 ring-2 ring-emerald-300/60'
              : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
        }`}
        title="Téléchargements (Ctrl+J) — Voir tous les documents téléchargés"
      >
        <Download className="w-3.5 h-3.5 shrink-0" />
        <span className="hidden xl:inline">Téléchargements</span>
        {downloads.length > 0 && (
          <span
            className={`px-1.5 py-0.2 rounded-full text-[10px] font-black leading-tight ${
              showDownloadsPanel
                ? 'bg-white text-blue-700'
                : recentBadge
                  ? 'bg-emerald-600 text-white animate-pulse'
                  : 'bg-blue-100 text-blue-800'
            }`}
          >
            {downloads.length}
          </span>
        )}
      </button>

      {/* Bouton menu "..." (comme l'image 4) incluant l'option "Téléchargements" */}
      <button
        type="button"
        onClick={() => {
          setShowMoreMenu((prev) => !prev);
          setShowDownloadsPanel(false);
        }}
        className={`h-8 w-8 rounded-full flex items-center justify-center border transition-all shadow-2xs cursor-pointer ${
          showMoreMenu
            ? 'bg-slate-800 text-white border-slate-900'
            : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
        }`}
        title="Menu options & Téléchargements"
      >
        <MoreHorizontal className="w-4 h-4" />
      </button>

      {/* Menu déroulant "..." (Image 4) avec le choix "Téléchargements" */}
      {showMoreMenu && (
        <div className="absolute right-0 top-10 w-64 bg-white rounded-xl shadow-2xl border border-slate-200 py-1.5 z-[9999] text-slate-800 animate-in fade-in zoom-in-95 duration-150">
          <div className="px-3 py-1.5 border-b border-slate-100 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
            Menu Application NELSON
          </div>
          <button
            type="button"
            onClick={() => {
              setShowMoreMenu(false);
              setShowDownloadsPanel(true);
              setRecentBadge(false);
            }}
            className="w-full px-3.5 py-2.5 text-left text-xs font-semibold text-slate-800 hover:bg-blue-50 hover:text-blue-700 flex items-center justify-between transition-colors cursor-pointer"
          >
            <span className="flex items-center gap-2.5">
              <Download className="w-4 h-4 text-blue-600" />
              <span>Téléchargements</span>
            </span>
            <span className="flex items-center gap-1.5">
              {downloads.length > 0 && (
                <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-blue-100 text-blue-700">
                  {downloads.length}
                </span>
              )}
              <span className="text-[10px] text-slate-400 font-normal">Ctrl+J</span>
            </span>
          </button>

          {downloads.length > 0 && (
            <>
              <button
                type="button"
                onClick={() => {
                  setShowMoreMenu(false);
                  handleOpenFile(downloads[0]);
                }}
                className="w-full px-3.5 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 transition-colors cursor-pointer"
              >
                <ExternalLink className="w-4 h-4 text-emerald-600" />
                <span className="truncate">Ouvrir le dernier document</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowMoreMenu(false);
                  handleSaveToFolder(downloads[0]);
                }}
                className="w-full px-3.5 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 transition-colors cursor-pointer"
              >
                <FolderOpen className="w-4 h-4 text-amber-600" />
                <span className="truncate">Enregistrer dans un dossier…</span>
              </button>
            </>
          )}
        </div>
      )}

      {/* Fenêtre "Téléchargements" (Fidèle à l'image 3) */}
      {showDownloadsPanel && (
        <div className="absolute right-0 top-10 w-[390px] sm:w-[430px] max-w-[94vw] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-[9999] text-slate-800 animate-in fade-in zoom-in-95 duration-150">
          {/* En-tête Téléchargements */}
          <div className="px-4 py-3 bg-slate-50/90 border-b border-slate-200 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-extrabold text-slate-900">Téléchargements</h3>
              {downloads.length > 0 && (
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-200/80 text-slate-700">
                  {downloads.length}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setShowSearch((prev) => !prev)}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  showSearch ? 'bg-blue-100 text-blue-700' : 'hover:bg-slate-200/70 text-slate-600'
                }`}
                title="Rechercher dans les téléchargements"
              >
                <Search className="w-4 h-4" />
              </button>
              {downloads.length > 0 && (
                <>
                  <button
                    type="button"
                    onClick={() => handleSaveToFolder(downloads[0])}
                    className="p-1.5 rounded-lg hover:bg-slate-200/70 text-slate-600 transition-colors cursor-pointer"
                    title="Ouvrir le dossier / Enregistrer le dernier fichier sous..."
                  >
                    <FolderOpen className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => clearAllDownloads()}
                    className="p-1.5 rounded-lg hover:bg-red-50 hover:text-red-600 text-slate-600 transition-colors cursor-pointer"
                    title="Effacer l'historique des téléchargements"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={() => setShowDownloadsPanel(false)}
                className="p-1.5 rounded-lg hover:bg-slate-200/70 text-slate-500 transition-colors cursor-pointer"
                title="Fermer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Barre de recherche optionnelle */}
          {showSearch && (
            <div className="px-3.5 py-2 bg-white border-b border-slate-100">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Rechercher un document téléchargé..."
                  className="w-full pl-8 pr-7 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Liste des fichiers téléchargés */}
          <div className="max-h-[400px] overflow-y-auto divide-y divide-slate-100">
            {filteredDownloads.length === 0 ? (
              <div className="py-10 px-6 text-center">
                <div className="w-11 h-11 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-2.5">
                  <Download className="w-5 h-5" />
                </div>
                <p className="text-xs font-bold text-slate-700">Aucun document téléchargé</p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Les dossiers PDF, notices, études et tableaux téléchargés dans NELSON apparaîtront ici pour que vous puissiez les rouvrir à tout moment.
                </p>
              </div>
            ) : (
              filteredDownloads.map((item, idx) => {
                const isPdf =
                  (item.fileName || '').toLowerCase().endsWith('.pdf') ||
                  (item.mimeType || '').includes('pdf');
                const sizeLabel = formatFileSize(item.size);
                const timeLabel = formatDownloadTime(item.timestamp);

                return (
                  <div
                    key={item.id}
                    className={`px-4 py-3 hover:bg-slate-50/90 transition-colors flex items-start gap-3 group ${
                      idx === 0 && recentBadge ? 'bg-blue-50/40' : ''
                    }`}
                  >
                    {getFileIcon(item.fileName, item.mimeType)}

                    <div className="flex-1 min-w-0">
                      <div
                        onClick={() => handleOpenFile(item)}
                        className="text-xs font-bold text-slate-900 truncate cursor-pointer hover:text-blue-600"
                        title={item.fileName}
                      >
                        {item.fileName}
                      </div>

                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <button
                          type="button"
                          onClick={() => handleOpenFile(item)}
                          className="text-[11px] font-bold text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <span>Ouvrir un fichier</span>
                        </button>
                        {isPdf && (
                          <>
                            <span className="text-slate-300">•</span>
                            <button
                              type="button"
                              onClick={() => {
                                const url = getValidUrl(item);
                                if (url) setPreviewItem({ ...item, url });
                              }}
                              className="text-[11px] font-semibold text-slate-600 hover:text-blue-700 hover:underline flex items-center gap-1 cursor-pointer"
                            >
                              <Eye className="w-3 h-3" />
                              <span>Aperçu</span>
                            </button>
                          </>
                        )}
                        <span className="text-slate-300">•</span>
                        <span className="text-[10px] text-slate-400">
                          {sizeLabel ? `${sizeLabel} • ` : ''}
                          {timeLabel}
                        </span>
                      </div>
                    </div>

                    {/* Boutons d'action rapides à droite (Dossier / Supprimer) */}
                    <div className="flex items-center gap-1 shrink-0 self-center">
                      <button
                        type="button"
                        onClick={() => handleSaveToFolder(item)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-blue-700 hover:bg-blue-50 transition-colors cursor-pointer"
                        title="Ouvrir le dossier / Enregistrer sous..."
                      >
                        <FolderOpen className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeDownloadEntry(item.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                        title="Supprimer de la liste"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Pied de liste */}
          {downloads.length > 0 && (
            <div className="px-4 py-2 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
              <span className="flex items-center gap-1 text-emerald-700 font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Disponibles hors-ligne dans l'application
              </span>
              <button
                type="button"
                onClick={() => handleOpenFile(downloads[0])}
                className="font-bold text-blue-600 hover:underline cursor-pointer"
              >
                Ouvrir le plus récent
              </button>
            </div>
          )}
        </div>
      )}

      {/* Visionneuse PDF intégrée au cas où l'utilisateur clique sur "Aperçu" ou si la fenêtre pop-up est bloquée */}
      {previewItem && (
        <div className="fixed inset-x-0 bottom-0 top-[64px] z-[10000] bg-slate-950/85 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-6xl h-[calc(100vh-96px)] bg-white rounded-2xl shadow-2xl border border-slate-300 overflow-hidden flex flex-col">
            <div className="px-5 py-3 bg-slate-900 text-white flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <FileText className="w-4 h-4 text-blue-400 shrink-0" />
                <span className="text-xs font-bold truncate">{previewItem.fileName}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleSaveToFolder(previewItem)}
                  className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <FolderOpen className="w-3.5 h-3.5" />
                  <span>Enregistrer sous…</span>
                </button>
                <button
                  type="button"
                  onClick={() => window.open(previewItem.url, '_blank')}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Nouvel onglet</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewItem(null)}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-red-600 text-white transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="flex-1 bg-slate-100">
              <iframe
                src={previewItem.url}
                title={previewItem.fileName}
                className="w-full h-full border-0"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
