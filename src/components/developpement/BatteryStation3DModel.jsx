import React, { useMemo } from 'react';
import * as THREE from 'three';

/**
 * Générateur de texture procédurale haute définition pour la façade avant de la CESC Mercury 261
 * Reproduction fidèle à 100% des visuels officiels CESC (photos réelles fournies)
 */
function createMercury261FrontTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 2048;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // 1. Fond blanc pur métallisé RAL 9003
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, 1024, 2048);

  // Bordure technique périmétrique subtile
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 6;
  ctx.strokeRect(6, 6, 1012, 2036);

  // 2. Grille de ventilation CVC HAUTE (Persiennes horizontales en partie supérieure)
  const topGrillY = 120;
  const topGrillH = 240;
  const grillW = 860;
  const grillX = 82;

  ctx.fillStyle = '#334155';
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(grillX, topGrillY, grillW, topGrillH, 12);
  else ctx.rect(grillX, topGrillY, grillW, topGrillH);
  ctx.fill();

  // Lamelles d'aération horizontales supérieures
  const slatCountTop = 10;
  const slatGapTop = topGrillH / slatCountTop;
  for (let i = 0; i < slatCountTop; i++) {
    const sy = topGrillY + i * slatGapTop + 4;
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(grillX + 6, sy, grillW - 12, slatGapTop - 8);
    // Reflet de lumière métallique sur chaque lamelle
    ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
    ctx.fillRect(grillX + 8, sy, grillW - 16, 3);
  }

  // 3. Logo "CESC" en haut à gauche
  ctx.fillStyle = '#1e293b';
  ctx.font = '900 68px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('CESC', 92, 440);

  // 4. Capsule verticale d'indicateurs d'état et arrêt d'urgence (En haut à droite)
  const pillX = 860;
  const pillY = 380;
  const pillW = 68;
  const pillH = 460;

  // Boîtier noir arrondi
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(pillX, pillY, pillW, pillH, 34);
  else ctx.rect(pillX, pillY, pillW, pillH);
  ctx.fill();
  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 3;
  ctx.stroke();

  // Voyants LED & Étiquettes
  const leds = [
    { label: 'POWER', color: '#22c55e', glow: '#16a34a', y: pillY + 60 },
    { label: 'FAULT', color: '#ef4444', glow: '#dc2626', y: pillY + 150 },
    { label: 'PRE-ALARM', color: '#f59e0b', glow: '#d97706', y: pillY + 240 },
  ];

  leds.forEach(led => {
    // Halo lumineux
    ctx.beginPath();
    ctx.arc(pillX + pillW / 2, led.y, 16, 0, Math.PI * 2);
    ctx.fillStyle = led.color;
    ctx.shadowColor = led.glow;
    ctx.shadowBlur = 12;
    ctx.fill();
    ctx.shadowBlur = 0;

    // Reflet blanc au centre de la LED
    ctx.beginPath();
    ctx.arc(pillX + pillW / 2 - 3, led.y - 3, 5, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.fill();

    // Étiquette texte à droite de la LED
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(led.label, pillX + pillW / 2, led.y + 32);
  });

  // Bouton Arrêt d'Urgence "E-STOP" (Coup de poing rouge en bas de la capsule)
  const estopY = pillY + 375;
  ctx.beginPath();
  ctx.arc(pillX + pillW / 2, estopY, 26, 0, Math.PI * 2);
  ctx.fillStyle = '#b91c1c';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(pillX + pillW / 2, estopY, 20, 0, Math.PI * 2);
  ctx.fillStyle = '#dc2626';
  ctx.shadowColor = '#ef4444';
  ctx.shadowBlur = 8;
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.fillStyle = '#94a3b8';
  ctx.font = 'bold 12px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('E-STOP', pillX + pillW / 2, estopY + 40);

  // 5. Trappe d'accès technique carrée (En bas à gauche)
  const hatchX = 92;
  const hatchY = 1120;
  const hatchSize = 180;

  ctx.fillStyle = '#94a3b8';
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(hatchX, hatchY, hatchSize, hatchSize, 8);
  else ctx.rect(hatchX, hatchY, hatchSize, hatchSize);
  ctx.fill();
  ctx.strokeStyle = '#64748b';
  ctx.lineWidth = 4;
  ctx.stroke();

  // Centre de trappe légèrement en creux
  ctx.fillStyle = '#cbd5e1';
  ctx.fillRect(hatchX + 16, hatchY + 16, hatchSize - 32, hatchSize - 32);

  // Rivets aux 4 coins
  const rivets = [
    [hatchX + 8, hatchY + 8],
    [hatchX + hatchSize - 8, hatchY + 8],
    [hatchX + 8, hatchY + hatchSize - 8],
    [hatchX + hatchSize - 8, hatchY + hatchSize - 8],
  ];
  rivets.forEach(([rx, ry]) => {
    ctx.beginPath();
    ctx.arc(rx, ry, 3.5, 0, Math.PI * 2);
    ctx.fillStyle = '#475569';
    ctx.fill();
  });

  // 6. Typographie de la station : "261 MERCURY" (Au milieu à droite)
  ctx.fillStyle = '#0f172a';
  ctx.font = '900 148px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('261', 930, 1070);

  ctx.fillStyle = '#334155';
  ctx.font = '700 38px system-ui, -apple-system, sans-serif';
  ctx.letterSpacing = '6px';
  ctx.fillText('MERCURY', 930, 1120);

  // 7. Bandeau dynamique Vert Fluo / Lime ("Signature CESC")
  ctx.save();
  ctx.strokeStyle = '#84cc16'; // Vert lime vibrant identique photo
  ctx.lineWidth = 32;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.beginPath();
  ctx.moveTo(60, 1340);
  ctx.lineTo(260, 1340);
  ctx.bezierCurveTo(340, 1340, 370, 1260, 440, 1170);
  ctx.bezierCurveTo(490, 1110, 560, 1090, 680, 1090);
  ctx.lineTo(1024, 1090);
  ctx.stroke();

  // Lignes hachurées tech vert lime aux extrémités
  ctx.lineWidth = 8;
  for (let i = 0; i < 5; i++) {
    const lx = 60 + i * 16;
    ctx.beginPath();
    ctx.moveTo(lx, 1365);
    ctx.lineTo(lx + 8, 1380);
    ctx.stroke();
  }
  for (let i = 0; i < 5; i++) {
    const rx = 870 + i * 16;
    ctx.beginPath();
    ctx.moveTo(rx, 1065);
    ctx.lineTo(rx + 8, 1050);
    ctx.stroke();
  }
  ctx.restore();

  // 8. Triangle de danger électrique (Norme ISO 7010 / NF C 13-100)
  const triX = 850;
  const triY = 1260;
  const triSize = 75;

  ctx.save();
  // Triangle jaune
  ctx.beginPath();
  ctx.moveTo(triX, triY - triSize);
  ctx.lineTo(triX - triSize * 0.86, triY + triSize * 0.5);
  ctx.lineTo(triX + triSize * 0.86, triY + triSize * 0.5);
  ctx.closePath();
  ctx.fillStyle = '#facc15';
  ctx.fill();
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 7;
  ctx.stroke();

  // Éclair noir
  ctx.fillStyle = '#000000';
  ctx.beginPath();
  ctx.moveTo(triX + 2, triY - 45);
  ctx.lineTo(triX - 18, triY + 2);
  ctx.lineTo(triX - 2, triY + 2);
  ctx.lineTo(triX - 12, triY + 34);
  ctx.lineTo(triX + 22, triY - 10);
  ctx.lineTo(triX + 4, triY - 10);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // 9. Grille de ventilation CVC BASSE (Persiennes d'admission en partie basse)
  const btmGrillY = 1480;
  const btmGrillH = 410;

  ctx.fillStyle = '#334155';
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(grillX, btmGrillY, grillW, btmGrillH, 12);
  else ctx.rect(grillX, btmGrillY, grillW, btmGrillH);
  ctx.fill();

  const slatCountBtm = 16;
  const slatGapBtm = btmGrillH / slatCountBtm;
  for (let i = 0; i < slatCountBtm; i++) {
    const sy = btmGrillY + i * slatGapBtm + 4;
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(grillX + 6, sy, grillW - 12, slatGapBtm - 8);
    // Reflet supérieur
    ctx.fillStyle = 'rgba(255, 255, 255, 0.16)';
    ctx.fillRect(grillX + 8, sy, grillW - 16, 2.5);
  }

  // 10. Socle inférieur RAL 7016
  ctx.fillStyle = '#475569';
  ctx.fillRect(0, 1980, 1024, 68);

  const texture = new THREE.CanvasTexture(canvas);
  texture.anisotropy = 8;
  texture.needsUpdate = true;
  return texture;
}

/**
 * Générateur de texture procédurale pour les flancs latéraux de la CESC Mercury 261
 */
function createMercury261SideTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 2048;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // Fond gris très clair RAL 9003
  ctx.fillStyle = '#f1f5f9';
  ctx.fillRect(0, 0, 1024, 2048);

  // Bordure
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 4;
  ctx.strokeRect(4, 4, 1016, 2040);

  // Logo discret CESC en haut à gauche
  ctx.fillStyle = '#334155';
  ctx.font = '900 54px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('CESC', 80, 240);

  ctx.fillStyle = '#64748b';
  ctx.font = '500 24px system-ui, sans-serif';
  ctx.fillText('Consistent Energy Storage Concept', 80, 180);

  // Grand texte vertical "MERCURY | 261"
  ctx.save();
  ctx.translate(880, 1100);
  ctx.rotate(-Math.PI / 2);
  ctx.fillStyle = '#94a3b8';
  ctx.font = '700 78px system-ui, -apple-system, sans-serif';
  ctx.letterSpacing = '12px';
  ctx.textAlign = 'center';
  ctx.fillText('MERCURY | 261', 0, 0);
  ctx.restore();

  // Continuation de la bande verte lime en partie basse
  ctx.fillStyle = '#84cc16';
  ctx.fillRect(0, 1420, 480, 32);

  // Socle inférieur
  ctx.fillStyle = '#475569';
  ctx.fillRect(0, 1980, 1024, 68);

  const texture = new THREE.CanvasTexture(canvas);
  texture.anisotropy = 8;
  texture.needsUpdate = true;
  return texture;
}

/**
 * BatteryStation3DModel
 * Rendu 3D solide, opaque et 100% fidèle aux spécifications CESC Mercury 261
 * - Toiture plate sleek sans aucun ventilateur (suppression conforme aux photos réelles)
 * - 4 armoires avec textures procédurales haute définition (logo CESC, voyants, 261 MERCURY, ligne lime, triangle électrique)
 * - Dalle béton armé 6.20m × 3.20m = 19.84 m² (< 20 m² DP)
 * - Clôture treillis rigide RAL 6005 ceinturant strictement le bord extérieur de la dalle
 */
export default function BatteryStation3DModel({
  dalleLength = 6.20,
  dalleWidth = 3.20,
  cabinetCount = 4,
  showFence = true,
  showSlab = true,
  opacity = 1.0,
  wireframe = false,
}) {
  const dLen = Number(dalleLength) || 6.20;
  const dWid = Number(dalleWidth) || 3.20;
  const slabH = 0.20; // 20 cm épaisseur de dalle béton armé

  // Dimensions strictes de l'armoire CESC Mercury 261
  const cabW = 1.15; // Largeur frontale
  const cabD = 1.44; // Profondeur
  const cabH = 2.38; // Hauteur
  const cabGap = 0.15; // 15 cm d'espacement technique réglementaire entre armoires

  // Textures haute définition procédurales fidèles aux photos
  const frontTexture = useMemo(() => createMercury261FrontTexture(), []);
  const sideTexture = useMemo(() => createMercury261SideTexture(), []);

  // Matériaux pleins et opaques
  const materials = useMemo(() => {
    const isTrans = opacity < 0.99;
    return {
      // Dalle béton armé
      slab: new THREE.MeshStandardMaterial({
        color: '#cbd5e1',
        roughness: 0.9,
        metalness: 0.05,
        transparent: isTrans,
        opacity,
        wireframe,
      }),
      slabEdge: new THREE.MeshStandardMaterial({
        color: '#94a3b8',
        roughness: 0.95,
        metalness: 0.05,
        transparent: isTrans,
        opacity,
      }),
      // Façade avant avec graphisme exact CESC Mercury 261
      cabinetFront: new THREE.MeshStandardMaterial({
        map: frontTexture,
        roughness: 0.25,
        metalness: 0.15,
        transparent: isTrans,
        opacity,
        wireframe,
      }),
      // Flancs latéraux avec logo et bandeau lime
      cabinetSide: new THREE.MeshStandardMaterial({
        map: sideTexture,
        roughness: 0.3,
        metalness: 0.15,
        transparent: isTrans,
        opacity,
        wireframe,
      }),
      // Face arrière et toit blanc pur RAL 9003
      cabinetBack: new THREE.MeshStandardMaterial({
        color: '#f8fafc',
        roughness: 0.3,
        metalness: 0.15,
        transparent: isTrans,
        opacity,
        wireframe,
      }),
      // Toit plat aluminium RAL 7035
      cabinetRoof: new THREE.MeshStandardMaterial({
        color: '#e2e8f0',
        roughness: 0.35,
        metalness: 0.25,
        transparent: isTrans,
        opacity,
      }),
      // Socle inférieur RAL 7016
      plinth: new THREE.MeshStandardMaterial({
        color: '#334155',
        roughness: 0.5,
        metalness: 0.4,
        transparent: isTrans,
        opacity,
      }),
      // Poignée noire verticale
      handle: new THREE.MeshStandardMaterial({
        color: '#0f172a',
        roughness: 0.2,
        metalness: 0.8,
        transparent: isTrans,
        opacity,
      }),
      // Poteaux clôture (Vert mousse RAL 6005)
      fencePost: new THREE.MeshStandardMaterial({
        color: '#166534',
        roughness: 0.35,
        metalness: 0.45,
        transparent: isTrans,
        opacity,
      }),
      // Treillis soudé rigide
      fenceMesh: new THREE.MeshStandardMaterial({
        color: '#14532d',
        roughness: 0.4,
        metalness: 0.5,
        transparent: true,
        opacity: Math.min(opacity, 0.75),
        side: THREE.DoubleSide,
      }),
    };
  }, [opacity, wireframe, frontTexture, sideTexture]);

  // Positions des armoires centrées sur la dalle
  const cabinets = useMemo(() => {
    const list = [];
    const count = Math.max(1, cabinetCount);
    const totalW = count * cabW + (count - 1) * cabGap;
    const startX = -totalW / 2 + cabW / 2;

    for (let i = 0; i < count; i++) {
      list.push({
        id: i,
        x: startX + i * (cabW + cabGap),
        y: slabH + cabH / 2, // Posée sur la dalle béton
        z: 0,
      });
    }
    return list;
  }, [cabinetCount, cabW, cabGap, slabH, cabH]);

  // Géométries
  const geometries = useMemo(() => {
    return {
      slab: new THREE.BoxGeometry(dLen, slabH, dWid),
      slabBevel: new THREE.BoxGeometry(dLen + 0.04, 0.04, dWid + 0.04),
      // Corps d'armoire
      body: new THREE.BoxGeometry(cabW, cabH - 0.12, cabD),
      // Toit plat sleek sans unité de climatisation ni ventilateurs
      roofCap: new THREE.BoxGeometry(cabW + 0.03, 0.05, cabD + 0.03),
      // Socle robuste
      plinth: new THREE.BoxGeometry(cabW + 0.02, 0.12, cabD + 0.02),
      // Flange / pieds de fixation
      footFlange: new THREE.BoxGeometry(0.12, 0.02, 0.14),
      // Poignée
      handle: new THREE.BoxGeometry(0.035, 0.24, 0.04),
      // Clôture
      postCorner: new THREE.BoxGeometry(0.06, 2.05, 0.06),
      postInter: new THREE.BoxGeometry(0.05, 2.05, 0.05),
      railLong: new THREE.BoxGeometry(dLen, 0.035, 0.035),
      railShort: new THREE.BoxGeometry(0.035, 0.035, dWid),
      panelLong: new THREE.PlaneGeometry(dLen, 1.95),
      panelShort: new THREE.PlaneGeometry(dWid, 1.95),
    };
  }, [dLen, dWid, slabH, cabW, cabD, cabH]);

  const fenceH = 2.0; // Clôture de 2 mètres réglementaire
  const fenceY = slabH + fenceH / 2;

  return (
    <group position={[0, 0, 0]}>
      {/* 1. DALLE BÉTON ARMÉ (< 20 m²) */}
      {showSlab && (
        <group position={[0, slabH / 2, 0]}>
          <mesh
            geometry={geometries.slab}
            material={materials.slab}
            castShadow
            receiveShadow
          />
          <mesh
            position={[0, -slabH / 2 + 0.02, 0]}
            geometry={geometries.slabBevel}
            material={materials.slabEdge}
          />
        </group>
      )}

      {/* 2. LES 4 ARMOIRES CESC MERCURY 261 (100% CONFORMES PHOTOS) */}
      {cabinets.map(cab => (
        <group key={cab.id} position={[cab.x, cab.y, cab.z]}>
          {/* Corps principal avec matériaux distincts pour chaque face */}
          {/* Face avant (+Z) */}
          <mesh
            position={[0, 0, cabD / 2]}
            castShadow
            receiveShadow
          >
            <planeGeometry args={[cabW, cabH - 0.12]} />
            <primitive object={materials.cabinetFront} attach="material" />
          </mesh>

          {/* Flanc droit (+X) */}
          <mesh
            position={[cabW / 2, 0, 0]}
            rotation={[0, Math.PI / 2, 0]}
            castShadow
            receiveShadow
          >
            <planeGeometry args={[cabD, cabH - 0.12]} />
            <primitive object={materials.cabinetSide} attach="material" />
          </mesh>

          {/* Flanc gauche (-X) */}
          <mesh
            position={[-cabW / 2, 0, 0]}
            rotation={[0, -Math.PI / 2, 0]}
            castShadow
            receiveShadow
          >
            <planeGeometry args={[cabD, cabH - 0.12]} />
            <primitive object={materials.cabinetSide} attach="material" />
          </mesh>

          {/* Face arrière (-Z) */}
          <mesh
            position={[0, 0, -cabD / 2]}
            rotation={[0, Math.PI, 0]}
            castShadow
            receiveShadow
          >
            <planeGeometry args={[cabW, cabH - 0.12]} />
            <primitive object={materials.cabinetBack} attach="material" />
          </mesh>

          {/* Toit plat sleek sans AUCUN ventilateur */}
          <mesh
            position={[0, (cabH - 0.12) / 2 + 0.025, 0]}
            geometry={geometries.roofCap}
            material={materials.cabinetRoof}
            castShadow
          />

          {/* Socle inférieur RAL 7016 */}
          <mesh
            position={[0, -cabH / 2 + 0.06, 0]}
            geometry={geometries.plinth}
            material={materials.plinth}
            castShadow
          />

          {/* 4 Pieds de fixation équerres aux coins du socle */}
          {[-cabW / 2 - 0.02, cabW / 2 + 0.02].map((fx, fxi) =>
            [-cabD / 2, cabD / 2].map((fz, fzi) => (
              <mesh
                key={`foot-${fxi}-${fzi}`}
                position={[fx, -cabH / 2 + 0.01, fz]}
                geometry={geometries.footFlange}
                material={materials.plinth}
              />
            ))
          )}

          {/* Poignée verticale noire ergonomique sur le montant gauche de la porte */}
          <mesh
            position={[-cabW / 2 + 0.04, 0.02, cabD / 2 + 0.025]}
            geometry={geometries.handle}
            material={materials.handle}
            castShadow
          />
        </group>
      ))}

      {/* 3. CLÔTURE TECHNIQUE EN TREILLIS SOUDÉ VERT RAL 6005 CEINTURANT STRICTEMENT LA DALLE */}
      {showFence && (
        <group position={[0, fenceY, 0]}>
          {/* Poteaux d'angle carrés sur platines ancrées à +3cm à l'intérieur du bord de dalle */}
          {[
            [-dLen / 2 + 0.03, -dWid / 2 + 0.03],
            [dLen / 2 - 0.03, -dWid / 2 + 0.03],
            [-dLen / 2 + 0.03, dWid / 2 - 0.03],
            [dLen / 2 - 0.03, dWid / 2 - 0.03],
          ].map(([px, pz], idx) => (
            <mesh
              key={`post-corner-${idx}`}
              position={[px, 0, pz]}
              geometry={geometries.postCorner}
              material={materials.fencePost}
              castShadow
            />
          ))}

          {/* Poteaux intermédiaires le long des façades longues */}
          {[-dLen / 6, dLen / 6].map((px, idx) => (
            <React.Fragment key={`post-inter-${idx}`}>
              <mesh
                position={[px, 0, -dWid / 2 + 0.03]}
                geometry={geometries.postInter}
                material={materials.fencePost}
                castShadow
              />
              <mesh
                position={[px, 0, dWid / 2 - 0.03]}
                geometry={geometries.postInter}
                material={materials.fencePost}
                castShadow
              />
            </React.Fragment>
          ))}

          {/* Lisses horizontales de rigidité (haute et basse) */}
          {[-0.85, 0.85].map((ry, idx) => (
            <React.Fragment key={`rail-${idx}`}>
              <mesh
                position={[0, ry, -dWid / 2 + 0.03]}
                geometry={geometries.railLong}
                material={materials.fencePost}
              />
              <mesh
                position={[0, ry, dWid / 2 - 0.03]}
                geometry={geometries.railLong}
                material={materials.fencePost}
              />
              <mesh
                position={[-dLen / 2 + 0.03, ry, 0]}
                geometry={geometries.railShort}
                material={materials.fencePost}
              />
              <mesh
                position={[dLen / 2 - 0.03, ry, 0]}
                geometry={geometries.railShort}
                material={materials.fencePost}
              />
            </React.Fragment>
          ))}

          {/* Panneaux de grillage en treillis rigide */}
          <mesh
            position={[0, 0, -dWid / 2 + 0.03]}
            geometry={geometries.panelLong}
            material={materials.fenceMesh}
          />
          <mesh
            position={[0, 0, dWid / 2 - 0.03]}
            geometry={geometries.panelLong}
            material={materials.fenceMesh}
          />
          <mesh
            position={[-dLen / 2 + 0.03, 0, 0]}
            rotation={[0, Math.PI / 2, 0]}
            geometry={geometries.panelShort}
            material={materials.fenceMesh}
          />
          <mesh
            position={[dLen / 2 - 0.03, 0, 0]}
            rotation={[0, Math.PI / 2, 0]}
            geometry={geometries.panelShort}
            material={materials.fenceMesh}
          />

          {/* Portillon d'accès technique (pignon Ouest +X) */}
          <group position={[dLen / 2 - 0.02, 0, 0]}>
            <mesh
              position={[0, 0, 0.45]}
              geometry={geometries.postInter}
              material={materials.fencePost}
            />
            <mesh
              position={[0, 0, -0.45]}
              geometry={geometries.postInter}
              material={materials.fencePost}
            />
            {/* Battant avec serrure */}
            <mesh
              position={[0.02, 0, 0]}
              rotation={[0, Math.PI / 2, 0]}
            >
              <planeGeometry args={[0.85, 1.9]} />
              <primitive object={materials.fenceMesh} attach="material" />
            </mesh>
            {/* Poignée portillon */}
            <mesh
              position={[0.04, 0, 0.35]}
              geometry={geometries.handle}
              material={materials.handle}
            />
          </group>
        </group>
      )}
    </group>
  );
}
