import React, { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';

/**
 * HTALayerEnedis — Affiche le tracé des lignes HTA Enedis :
 * - En trait plein si aérien (dataset reseau-hta)
 * - En pointillé si souterrain (dataset reseau-souterrain-hta)
 * Identique au fonctionnement et au rendu de la page Éditeur de projet.
 */
export default function HTALayerEnedis({ active = true, onCountsChange = null }) {
  const map = useMap();
  const layerGroupRef = useRef(L.featureGroup());
  const abortControllerRef = useRef(null);
  const debounceTimerRef = useRef(null);

  const fetchHtaLines = async () => {
    if (!active || !map) return;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    const bounds = map.getBounds();
    // Tampon de 25% autour de la vue courante pour charger les segments adjacents
    const padBounds = bounds.pad(0.25);
    const lonMin = padBounds.getWest();
    const latMin = padBounds.getSouth();
    const lonMax = padBounds.getEast();
    const latMax = padBounds.getNorth();
    const bbox = `${lonMin},${latMin},${lonMax},${latMax}`;

    const urls = [
      `https://opendata.enedis.fr/data-fair/api/v1/datasets/reseau-hta/lines?size=1000&bbox=${bbox}`,
      `https://opendata.enedis.fr/data-fair/api/v1/datasets/reseau-souterrain-hta/lines?size=1000&bbox=${bbox}`
    ];

    try {
      const rawResults = await Promise.all(
        urls.map((u) =>
          fetch(u, { signal: abortControllerRef.current.signal })
            .then((res) => (res.ok ? res.json() : { results: [] }))
            .catch((err) => {
              if (err.name !== 'AbortError') console.warn('[HTALayerEnedis] Erreur fetch dataset:', err);
              return { results: [] };
            })
        )
      );

      layerGroupRef.current.clearLayers();

      let aerienCount = 0;
      let souterrainCount = 0;

      rawResults.forEach((data, index) => {
        if (!data?.results || data.results.length === 0) return;
        const isSouterraine = index === 1;

        if (isSouterraine) {
          souterrainCount += data.results.length;
        } else {
          aerienCount += data.results.length;
        }

        const geoJson = {
          type: 'FeatureCollection',
          features: data.results.map((r) => ({
            type: 'Feature',
            geometry: typeof r.geometry === 'string' ? JSON.parse(r.geometry) : r.geometry,
            properties: r
          }))
        };

        L.geoJSON(geoJson, {
          style: {
            color: '#facc15', // Jaune éclatant Enedis (identique à l'Éditeur de projet)
            weight: 3.5,
            dashArray: isSouterraine ? '6, 6' : null, // Pointillé si souterrain, Trait plein si aérien
            opacity: 0.95
          },
          onEachFeature: (feature, layer) => {
            const props = feature.properties || {};
            const typeLabel = isSouterraine ? 'Souterraine (Pointillé)' : 'Aérienne (Trait plein)';
            const headerColor = isSouterraine ? '#0284c7' : '#d97706';

            layer.bindPopup(`
              <div style="font-family: system-ui, -apple-system, sans-serif; padding: 6px; color: #0f172a; min-width: 170px;">
                <div style="font-weight: 900; color: ${headerColor}; font-size: 12.5px; margin-bottom: 4px; display: flex; align-items: center; gap: 4px;">
                  ⚡ Ligne HTA ${typeLabel}
                </div>
                ${props.nom_depart ? `<div style="font-size: 11px; margin-bottom: 2px; color: #334155;"><strong>Départ :</strong> ${props.nom_depart}</div>` : ''}
                ${props.longueur_reseau ? `<div style="font-size: 11px; margin-bottom: 2px; color: #334155;"><strong>Longueur :</strong> ${Math.round(props.longueur_reseau)} m</div>` : ''}
                ${props.code_commune ? `<div style="font-size: 11px; margin-bottom: 2px; color: #334155;"><strong>Commune :</strong> ${props.nom_commune || props.code_commune}</div>` : ''}
                ${props.tension ? `<div style="font-size: 11px; color: #334155;"><strong>Tension :</strong> ${props.tension}</div>` : ''}
              </div>
            `);
          }
        }).addTo(layerGroupRef.current);
      });

      if (onCountsChange) {
        onCountsChange({ aerienCount, souterrainCount });
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.warn('[HTALayerEnedis] Erreur globale lignes HTA:', err);
      }
    }
  };

  const debouncedFetch = () => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      fetchHtaLines();
    }, 250);
  };

  useEffect(() => {
    if (!map) return;

    if (active) {
      if (!map.hasLayer(layerGroupRef.current)) {
        layerGroupRef.current.addTo(map);
      }
      fetchHtaLines();

      const handleMoveEnd = () => debouncedFetch();
      map.on('moveend', handleMoveEnd);

      return () => {
        map.off('moveend', handleMoveEnd);
        if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
        if (abortControllerRef.current) abortControllerRef.current.abort();
      };
    } else {
      if (map.hasLayer(layerGroupRef.current)) {
        map.removeLayer(layerGroupRef.current);
      }
    }
  }, [active, map]);

  return null;
}
