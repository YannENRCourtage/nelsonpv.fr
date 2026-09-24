import React, { useState, useMemo } from 'react';
import { X, Sparkles, FolderPlus, Layers, CheckSquare, Square, ChevronRight, ChevronDown } from 'lucide-react';

/**
 * Common prefixes or patterns detection helper
 */
function detectClusters(rows) {
  if (!rows || rows.length === 0) return [];

  // Group candidates by first word or common prefix pattern
  const map = new Map();

  rows.forEach((row) => {
    // Look at first column value or 'name' or 'NAME' or 'Nom' or row.data[Object.keys(row.data)[0]]
    const nameVal = row.name || (row.data && (row.data['NAME'] || row.data['Nom'] || row.data['Site internet'] || Object.values(row.data)[0])) || '';
    const cleanStr = String(nameVal).trim();
    if (!cleanStr) return;

    // Detect key prefixes: GOOGLE, NELSON, ENR COURTAGE, BARCONNIERE, MICROSOFT, EDF, ENEDIS, OVH, etc.
    const words = cleanStr.split(/[\s\-_\/:]+/);
    let key = '';

    if (words.length >= 2) {
      const twoWords = `${words[0]} ${words[1]}`.toUpperCase();
      if (['ENR COURTAGE', 'GREEN INVEST', 'GOOGLE WORKSPACE', 'NELSON PV', 'ESPACE CLIENT'].includes(twoWords)) {
        key = twoWords;
      }
    }

    if (!key && words.length >= 1) {
      const firstWord = words[0].toUpperCase();
      // Only group if length >= 3 and not common noise words
      if (firstWord.length >= 3 && !['THE', 'LES', 'DES', 'UNE', 'MON', 'MES', 'POUR', 'AVEC', 'SITE'].includes(firstWord)) {
        key = firstWord;
      }
    }

    if (key) {
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key).push(row);
    }
  });

  // Keep clusters with >= 2 rows
  const clusters = [];
  map.forEach((clusterRows, prefix) => {
    if (clusterRows.length >= 2) {
      clusters.push({
        id: prefix,
        prefix,
        parentName: prefix,
        rows: clusterRows,
        stripPrefix: true,
        selected: true
      });
    }
  });

  // Sort by count descending
  return clusters.sort((a, b) => b.rows.length - a.rows.length);
}

export default function AutoGroupModal({
  isOpen,
  onClose,
  rows = [],
  onConfirmAutoGroup,
  isProcessing = false
}) {
  const initialClusters = useMemo(() => detectClusters(rows), [rows]);
  const [clusters, setClusters] = useState(initialClusters);
  const [expandedClusters, setExpandedClusters] = useState({});

  // Reset or update state if initial clusters change
  React.useEffect(() => {
    setClusters(initialClusters);
    // Expand top 2 by default
    const exp = {};
    if (initialClusters.length > 0) exp[initialClusters[0].id] = true;
    if (initialClusters.length > 1) exp[initialClusters[1].id] = true;
    setExpandedClusters(exp);
  }, [initialClusters]);

  if (!isOpen) return null;

  const toggleClusterSelected = (id) => {
    setClusters((prev) =>
      prev.map((c) => (c.id === id ? { ...c, selected: !c.selected } : c))
    );
  };

  const toggleAll = (select) => {
    setClusters((prev) => prev.map((c) => ({ ...c, selected: select })));
  };

  const toggleExpand = (id) => {
    setExpandedClusters((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const updateParentName = (id, newName) => {
    setClusters((prev) =>
      prev.map((c) => (c.id === id ? { ...c, parentName: newName } : c))
    );
  };

  const toggleStripPrefix = (id) => {
    setClusters((prev) =>
      prev.map((c) => (c.id === id ? { ...c, stripPrefix: !c.stripPrefix } : c))
    );
  };

  const selectedClusters = clusters.filter((c) => c.selected);
  const totalRowsAffected = selectedClusters.reduce((sum, c) => sum + c.rows.length, 0);

  const handleConfirm = () => {
    if (selectedClusters.length === 0) return;
    onConfirmAutoGroup(selectedClusters);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(4px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#1E293B',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '720px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.1)',
          overflow: 'hidden',
          color: '#F8FAFC'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid #334155',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(168, 85, 247, 0.15))'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                backgroundColor: 'rgba(99, 102, 241, 0.25)',
                border: '1px solid rgba(99, 102, 241, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#818CF8'
              }}
            >
              <Sparkles size={22} />
            </div>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 600, margin: 0, color: '#FFFFFF' }}>
                Regroupement automatique intelligent
              </h2>
              <p style={{ fontSize: '13px', margin: '2px 0 0 0', color: '#94A3B8' }}>
                Détection automatique des éléments partageant le même préfixe (Google, Nelson, etc.)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isProcessing}
            style={{
              background: 'none',
              border: 'none',
              color: '#94A3B8',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {clusters.length === 0 ? (
            <div
              style={{
                padding: '40px 20px',
                textAlign: 'center',
                backgroundColor: 'rgba(15, 23, 42, 0.4)',
                borderRadius: '12px',
                border: '1px dashed #334155'
              }}
            >
              <Layers size={36} color="#64748B" style={{ margin: '0 auto 12px' }} />
              <p style={{ margin: 0, fontWeight: 500, color: '#E2E8F0' }}>
                Aucun groupe récurrent détecté automatiquement
              </p>
              <p style={{ margin: '6px 0 0 0', fontSize: '13px', color: '#94A3B8' }}>
                Vous pouvez sélectionner manuellement plusieurs lignes avec les cases à cocher et cliquer sur « Regrouper en sous-éléments ».
              </p>
            </div>
          ) : (
            <>
              {/* Controls bar */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  backgroundColor: 'rgba(15, 23, 42, 0.6)',
                  borderRadius: '8px',
                  border: '1px solid #334155',
                  fontSize: '13px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#94A3B8' }}>
                  <span>{clusters.length} groupe(s) potentiel(s) trouvé(s)</span>
                  <span>•</span>
                  <span style={{ color: '#818CF8', fontWeight: 600 }}>{totalRowsAffected} ligne(s) ciblée(s)</span>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    type="button"
                    onClick={() => toggleAll(true)}
                    style={{ background: 'none', border: 'none', color: '#60A5FA', cursor: 'pointer', fontSize: '12px', fontWeight: 500, padding: 0 }}
                  >
                    Tout sélectionner
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleAll(false)}
                    style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', fontSize: '12px', padding: 0 }}
                  >
                    Tout désélectionner
                  </button>
                </div>
              </div>

              {/* Cluster items */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {clusters.map((cluster) => {
                  const isExp = !!expandedClusters[cluster.id];
                  return (
                    <div
                      key={cluster.id}
                      style={{
                        backgroundColor: cluster.selected ? 'rgba(30, 41, 59, 0.8)' : 'rgba(15, 23, 42, 0.4)',
                        border: cluster.selected ? '1px solid #6366F1' : '1px solid #334155',
                        borderRadius: '10px',
                        overflow: 'hidden',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {/* Cluster Header */}
                      <div
                        style={{
                          padding: '12px 14px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          cursor: 'pointer',
                          userSelect: 'none'
                        }}
                        onClick={() => toggleClusterSelected(cluster.id)}
                      >
                        <div
                          style={{
                            color: cluster.selected ? '#818CF8' : '#64748B',
                            display: 'flex',
                            alignItems: 'center'
                          }}
                        >
                          {cluster.selected ? <CheckSquare size={18} /> : <Square size={18} />}
                        </div>

                        <div
                          style={{
                            flex: 1,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            minWidth: 0
                          }}
                        >
                          <span style={{ fontWeight: 600, color: '#FFFFFF', fontSize: '14px' }}>
                            {cluster.prefix}
                          </span>
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 600,
                              padding: '2px 8px',
                              borderRadius: '999px',
                              backgroundColor: 'rgba(99, 102, 241, 0.2)',
                              color: '#A5B4FC',
                              border: '1px solid rgba(99, 102, 241, 0.3)'
                            }}
                          >
                            {cluster.rows.length} sous-éléments
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleExpand(cluster.id);
                          }}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#94A3B8',
                            cursor: 'pointer',
                            padding: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            borderRadius: '4px'
                          }}
                        >
                          {isExp ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                        </button>
                      </div>

                      {/* Cluster Details */}
                      {isExp && (
                        <div
                          style={{
                            padding: '12px 14px 14px 14px',
                            borderTop: '1px solid #334155',
                            backgroundColor: 'rgba(15, 23, 42, 0.6)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '10px'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <label style={{ fontSize: '12px', color: '#94A3B8', minWidth: '130px' }}>
                              Nom du groupe parent :
                            </label>
                            <input
                              type="text"
                              value={cluster.parentName}
                              onChange={(e) => updateParentName(cluster.id, e.target.value)}
                              onClick={(e) => e.stopPropagation()}
                              style={{
                                flex: 1,
                                backgroundColor: '#1E293B',
                                border: '1px solid #475569',
                                borderRadius: '6px',
                                color: '#FFFFFF',
                                padding: '6px 10px',
                                fontSize: '13px'
                              }}
                            />
                          </div>

                          <label
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              fontSize: '12px',
                              color: '#CBD5E1',
                              cursor: 'pointer'
                            }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <input
                              type="checkbox"
                              checked={cluster.stripPrefix}
                              onChange={() => toggleStripPrefix(cluster.id)}
                              style={{ accentColor: '#6366F1' }}
                            />
                            Nettoyer le préfixe « {cluster.prefix} » du nom des sous-éléments
                          </label>

                          {/* List of rows */}
                          <div
                            style={{
                              maxHeight: '140px',
                              overflowY: 'auto',
                              backgroundColor: '#0F172A',
                              borderRadius: '6px',
                              border: '1px solid #334155',
                              padding: '6px 10px'
                            }}
                          >
                            {cluster.rows.map((r, i) => {
                              const rName = r.name || (r.data && (r.data['NAME'] || r.data['Nom'] || r.data['Site internet'] || Object.values(r.data)[0])) || `Ligne ${i + 1}`;
                              return (
                                <div
                                  key={r.id || i}
                                  style={{
                                    fontSize: '12px',
                                    color: '#94A3B8',
                                    padding: '3px 0',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px'
                                  }}
                                >
                                  <span style={{ color: '#6366F1' }}>•</span>
                                  <span style={{ color: '#E2E8F0' }}>{rName}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid #334155',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: 'rgba(15, 23, 42, 0.8)'
          }}
        >
          <button
            onClick={onClose}
            disabled={isProcessing}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              backgroundColor: '#334155',
              border: 'none',
              color: '#E2E8F0',
              cursor: isProcessing ? 'not-allowed' : 'pointer',
              fontWeight: 500,
              fontSize: '13px'
            }}
          >
            Annuler
          </button>
          <button
            onClick={handleConfirm}
            disabled={isProcessing || selectedClusters.length === 0}
            style={{
              padding: '8px 20px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
              border: 'none',
              color: '#FFFFFF',
              cursor: isProcessing || selectedClusters.length === 0 ? 'not-allowed' : 'pointer',
              opacity: isProcessing || selectedClusters.length === 0 ? 0.6 : 1,
              fontWeight: 600,
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)'
            }}
          >
            <FolderPlus size={16} />
            {isProcessing
              ? 'Regroupement en cours...'
              : `Regrouper les ${selectedClusters.length} groupe(s) (${totalRowsAffected} lignes)`}
          </button>
        </div>
      </div>
    </div>
  );
}
