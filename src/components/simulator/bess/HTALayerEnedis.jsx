import React, { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';

/**
 * Calcul de la distance géodésique en mètres entre deux coordonnées WGS84
 */
function getDistanceInMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
 * HTALayerEnedis — Couche cartographique Leaflet intégrée :
 * 1. Lignes HTA Enedis :
 *    - Trait plein si aérien (dataset reseau-hta)
 *    - Pointillé si souterrain (dataset reseau-souterrain-hta)
 * 2. Transformateurs Enedis réels (dataset poste-electrique) :
 *    - Placés rigoureusement à leurs coordonnées GPS officielles de l'API Enedis
 *    - Carrés rouges avec contour blanc (conforme à l'Éditeur de projet, Image 4)
 *    - Identification du transformateur le plus proche de l'adresse recherchée
 */
export default function HTALayerEnedis({
  active = true,
  searchedCoords = null,
  onNearestTransfoFound = null,
  onCountsChange = null
}) {
  const map = useMap();
  const layerGroupRef = useRef(L.featureGroup());
  const abortControllerRef = useRef(null);
  const debounceTimerRef = useRef(null);

  const fetchEnedisData = async () => {
    if (!active || !map) return;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    const bounds = map.getBounds();
    // Tampon de 25% pour charger les éléments adjacents lors du panoramique
    const padBounds = bounds.pad(0.25);
    const lonMin = padBounds.getWest();
    const latMin = padBounds.getSouth();
    const lonMax = padBounds.getEast();
    const latMax = padBounds.getNorth();
    const bbox = `${lonMin},${latMin},${lonMax},${latMax}`;

    const urls = [
      `https://opendata.enedis.fr/data-fair/api/v1/datasets/reseau-hta/lines?size=1000&bbox=${bbox}`,
      `https://opendata.enedis.fr/data-fair/api/v1/datasets/reseau-souterrain-hta/lines?size=1000&bbox=${bbox}`,
      `https://opendata.enedis.fr/data-fair/api/v1/datasets/poste-electrique/lines?size=1000&bbox=${bbox}`
    ];

    try {
      const [htaAerienData, htaSouterrainData, postesData] = await Promise.all(
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

      const aerienResults = htaAerienData?.results || [];
      const souterrainResults = htaSouterrainData?.results || [];
      const postesResults = postesData?.results || [];

      // 1. TRACÉ DES LIGNES HTA ENEDIS
      [
        { data: aerienResults, isSouterrain: false },
        { data: souterrainResults, isSouterrain: true }
      ].forEach(({ data, isSouterrain }) => {
        if (!data || data.length === 0) return;

        const geoJson = {
          type: 'FeatureCollection',
          features: data.map((r) => ({
            type: 'Feature',
            geometry: typeof r.geometry === 'string' ? JSON.parse(r.geometry) : r.geometry,
            properties: r
          }))
        };

        L.geoJSON(geoJson, {
          style: {
            color: '#facc15', // Jaune vif Enedis
            weight: 3.5,
            dashArray: isSouterrain ? '6, 6' : null, // Pointillé si souterrain, Trait plein si aérien
            opacity: 0.95
          },
          onEachFeature: (feature, layer) => {
            const props = feature.properties || {};
            const typeLabel = isSouterrain ? 'Souterraine (Pointillé)' : 'Aérienne (Trait plein)';
            const headerColor = isSouterrain ? '#0284c7' : '#d97706';

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

      // 2. TRANSFORMATEURS ENEDIS RÉELS (POSTES HTA/BT) À LEURS POSITIONS EXACTES
      let closestPoste = null;
      let minDistance = Infinity;

      const parsedPostes = postesResults.map((r) => {
        const geom = typeof r.geometry === 'string' ? JSON.parse(r.geometry) : r.geometry;
        const coords = geom?.coordinates || [];
        const lng = coords[0];
        const lat = coords[1];

        let distToAddress = null;
        if (searchedCoords && searchedCoords[0] && searchedCoords[1] && lat && lng) {
          distToAddress = getDistanceInMeters(searchedCoords[0], searchedCoords[1], lat, lng);
          if (distToAddress < minDistance) {
            minDistance = distToAddress;
            closestPoste = { ...r, lat, lng, distance: distToAddress };
          }
        }

        return { ...r, lat, lng, distToAddress };
      });

      if (closestPoste && onNearestTransfoFound) {
        onNearestTransfoFound(closestPoste, minDistance);
      }

      parsedPostes.forEach((poste) => {
        if (!poste.lat || !poste.lng) return;

        const isClosest = closestPoste && closestPoste._id === poste._id;

        const iconHtml = isClosest
          ? `
            <div style="
              position: relative;
              width: 20px;
              height: 20px;
              background: linear-gradient(135deg, #ef4444 0%, #b91c1c 100%);
              border: 2px solid #ffffff;
              border-radius: 4px;
              box-shadow: 0 0 10px rgba(239, 68, 68, 0.9), 0 2px 6px rgba(0,0,0,0.5);
              display: flex;
              align-items: center;
              justify-content: center;
              color: #ffffff;
              font-size: 11px;
              font-weight: 900;
              cursor: pointer;
            ">
              ⚡
              <span style="
                position: absolute;
                top: -9px;
                right: -9px;
                background: #10b981;
                color: #000000;
                font-size: 8px;
                font-weight: 900;
                padding: 1px 3px;
                border-radius: 3px;
                border: 1px solid #ffffff;
                box-shadow: 0 1px 3px rgba(0,0,0,0.4);
              ">SOL</span>
            </div>
          `
          : `
            <div style="
              background-color: #ef4444;
              width: 12px;
              height: 12px;
              border: 1.5px solid #ffffff;
              border-radius: 2px;
              box-shadow: 0 0 4px rgba(0,0,0,0.6);
              cursor: pointer;
            "></div>
          `;

        const markerIcon = L.divIcon({
          className: isClosest ? 'bess-transfo-closest-marker' : 'bess-transfo-marker',
          html: iconHtml,
          iconSize: isClosest ? [20, 20] : [12, 12],
          iconAnchor: isClosest ? [10, 10] : [6, 6],
          popupAnchor: isClosest ? [0, -12] : [0, -8]
        });

        const marker = L.marker([poste.lat, poste.lng], { icon: markerIcon });
        
        const popupContent = `
          <div style="font-family: system-ui, -apple-system, sans-serif; padding: 6px; color: #0f172a; min-width: 180px;">
            <div style="font-weight: 900; color: #dc2626; font-size: 13px; margin-bottom: 4px; display: flex; align-items: center; gap: 4px;">
              ⚡ Poste HTA/BT Enedis ${isClosest ? '<span style="background: #10b981; color: white; font-size: 9px; padding: 1px 4px; border-radius: 4px;">Plus proche</span>' : ''}
            </div>
            ${poste.nom_poste ? `<div style="font-size: 11px; margin-bottom: 2px;"><strong>Nom :</strong> ${poste.nom_poste}</div>` : ''}
            ${poste.type_poste ? `<div style="font-size: 11px; margin-bottom: 2px;"><strong>Type :</strong> ${poste.type_poste}</div>` : ''}
            ${poste.nom_commune ? `<div style="font-size: 11px; margin-bottom: 2px;"><strong>Commune :</strong> ${poste.nom_commune}</div>` : ''}
            ${poste.distToAddress !== null ? `<div style="font-size: 11px; color: #0284c7; font-weight: bold; margin-top: 4px;"><strong>Distance à l'adresse :</strong> ${poste.distToAddress} m</div>` : ''}
            <div style="font-size: 10px; color: #64748b; margin-top: 4px; font-family: monospace;">GPS Enedis : ${poste.lat.toFixed(5)}, ${poste.lng.toFixed(5)}</div>
          </div>
        `;
        
        marker.bindPopup(popupContent, { maxWidth: 300 });
        marker.addTo(layerGroupRef.current);
      });

      if (onCountsChange) {
        onCountsChange({
          aerienCount: aerienResults.length,
          souterrainCount: souterrainResults.length,
          postesCount: parsedPostes.length
        });
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.warn('[HTALayerEnedis] Erreur globale chargement Enedis:', err);
      }
    }
  };

  const debouncedFetch = () => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      fetchEnedisData();
    }, 250);
  };

  useEffect(() => {
    if (!map) return;

    if (active) {
      if (!map.hasLayer(layerGroupRef.current)) {
        layerGroupRef.current.addTo(map);
      }
      fetchEnedisData();

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
  }, [active, map, searchedCoords?.[0], searchedCoords?.[1]]);

  return null;
}
