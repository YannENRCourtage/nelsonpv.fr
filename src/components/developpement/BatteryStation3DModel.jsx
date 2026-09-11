import React, { useMemo } from 'react';
import * as THREE from 'three';

/**
 * BatteryStation3DModel
 * Rendu 3D solide, opaque et réaliste pour la Station Batteries Stand-Alone (500 kW)
 * Composants :
 * 1. Dalle béton armé : 6.20m × 3.20m = 19.84 m² (< 20 m² réglementaire DP)
 * 2. 4 Armoires CESC Mercury 261 pleines et opaques (1.15m L × 1.44m P × 2.38m H)
 * 3. Clôture rigide (grillage vert RAL 6005) modélisée directement sur le bord extérieur de la dalle
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
  const slabH = 0.20; // 20 cm d'épaisseur pour la dalle béton

  // Matériaux pleins et opaques
  const materials = useMemo(() => {
    const isTrans = opacity < 0.99;
    return {
      // Béton dalle
      slab: new THREE.MeshStandardMaterial({
        color: '#cbd5e1', // Gris béton clair
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
      // Corps d'armoire CESC Mercury 261 (Blanc pur RAL 9003 opaque)
      cabinetBody: new THREE.MeshStandardMaterial({
        color: '#f8fafc',
        roughness: 0.22,
        metalness: 0.18,
        transparent: isTrans,
        opacity,
        wireframe,
      }),
      // Socle technique et cadre supérieur (Gris anthracite RAL 7016)
      cabinetFrame: new THREE.MeshStandardMaterial({
        color: '#1e293b',
        roughness: 0.45,
        metalness: 0.5,
        transparent: isTrans,
        opacity,
      }),
      // Grilles d'aération CVC (Noir mat / sombre)
      grill: new THREE.MeshStandardMaterial({
        color: '#0f172a',
        roughness: 0.8,
        metalness: 0.3,
        transparent: isTrans,
        opacity,
      }),
      // Écran tactile IHM
      screen: new THREE.MeshStandardMaterial({
        color: '#0284c7',
        roughness: 0.1,
        metalness: 0.8,
        emissive: '#0369a1',
        emissiveIntensity: 0.35,
        transparent: isTrans,
        opacity,
      }),
      // Poignées inox
      handle: new THREE.MeshStandardMaterial({
        color: '#e2e8f0',
        roughness: 0.2,
        metalness: 0.85,
        transparent: isTrans,
        opacity,
      }),
      // Voyant LED opérationnel (Vert fluo)
      ledGreen: new THREE.MeshStandardMaterial({
        color: '#22c55e',
        emissive: '#16a34a',
        emissiveIntensity: 0.8,
        roughness: 0.2,
      }),
      // Voyant arrêt d'urgence (Rouge)
      ledRed: new THREE.MeshStandardMaterial({
        color: '#ef4444',
        emissive: '#dc2626',
        emissiveIntensity: 0.6,
        roughness: 0.2,
      }),
      // Poteaux et lisses de clôture (Vert mousse RAL 6005)
      fencePost: new THREE.MeshStandardMaterial({
        color: '#166534',
        roughness: 0.35,
        metalness: 0.45,
        transparent: isTrans,
        opacity,
      }),
      // Treillis soudé / grillage rigide
      fenceMesh: new THREE.MeshStandardMaterial({
        color: '#14532d',
        roughness: 0.4,
        metalness: 0.5,
        transparent: true,
        opacity: Math.min(opacity, 0.72),
        side: THREE.DoubleSide,
      }),
      // Ligne de marquage / joints
      seam: new THREE.MeshBasicMaterial({
        color: '#64748b',
      }),
    };
  }, [opacity, wireframe]);

  // Dimensions unitaires de l'armoire CESC Mercury 261
  const cabW = 1.15;
  const cabD = 1.44;
  const cabH = 2.38;
  const cabGap = 0.15; // 15 cm entre armoires

  // Calcul des positions des 4 armoires centrées sur la dalle
  const cabinets = useMemo(() => {
    const list = [];
    const count = Math.max(1, cabinetCount);
    const totalW = count * cabW + (count - 1) * cabGap;
    const startX = -totalW / 2 + cabW / 2;

    for (let i = 0; i < count; i++) {
      list.push({
        id: i,
        x: startX + i * (cabW + cabGap),
        y: slabH + cabH / 2, // Posée sur la dalle
        z: 0,
      });
    }
    return list;
  }, [cabinetCount, cabW, cabGap, slabH, cabH]);

  // Géométries partagées des armoires pour performances optimales
  const geometries = useMemo(() => {
    return {
      slab: new THREE.BoxGeometry(dLen, slabH, dWid),
      slabBevel: new THREE.BoxGeometry(dLen + 0.04, 0.04, dWid + 0.04),
      // Corps d'armoire
      body: new THREE.BoxGeometry(cabW, cabH - 0.24, cabD),
      plinth: new THREE.BoxGeometry(cabW + 0.02, 0.12, cabD + 0.02),
      roofCap: new THREE.BoxGeometry(cabW + 0.02, 0.12, cabD + 0.02),
      // CVC / HVAC de toit
      hvacUnit: new THREE.BoxGeometry(cabW * 0.8, 0.18, cabD * 0.6),
      hvacFan: new THREE.CylinderGeometry(0.22, 0.22, 0.03, 16),
      // Porte et détails face avant (Z = +cabD/2)
      doorGroove: new THREE.BoxGeometry(0.015, cabH - 0.35, 0.01),
      handle: new THREE.BoxGeometry(0.03, 0.22, 0.035),
      grillUpper: new THREE.BoxGeometry(cabW * 0.82, 0.38, 0.02),
      grillLower: new THREE.BoxGeometry(cabW * 0.82, 0.22, 0.02),
      screen: new THREE.BoxGeometry(0.22, 0.15, 0.015),
      led: new THREE.CylinderGeometry(0.015, 0.015, 0.01, 8),
      // Clôture
      postCorner: new THREE.BoxGeometry(0.06, 2.05, 0.06),
      postInter: new THREE.BoxGeometry(0.05, 2.05, 0.05),
      railLong: new THREE.BoxGeometry(dLen, 0.035, 0.035),
      railShort: new THREE.BoxGeometry(0.035, 0.035, dWid),
      panelLong: new THREE.PlaneGeometry(dLen, 1.95),
      panelShort: new THREE.PlaneGeometry(dWid, 1.95),
    };
  }, [dLen, dWid, slabH, cabW, cabD, cabH]);

  const fenceH = 2.0; // Hauteur de la clôture (2 mètres au-dessus de la dalle)
  const fenceY = slabH + fenceH / 2;

  return (
    <group position={[0, 0, 0]}>
      {/* 1. DALLE BÉTON UNIQUE (< 20 m²) */}
      {showSlab && (
        <group position={[0, slabH / 2, 0]}>
          <mesh
            geometry={geometries.slab}
            material={materials.slab}
            castShadow
            receiveShadow
          />
          {/* Chanfrein technique sur la base */}
          <mesh
            position={[0, -slabH / 2 + 0.02, 0]}
            geometry={geometries.slabBevel}
            material={materials.slabEdge}
          />
        </group>
      )}

      {/* 2. LES 4 ARMOIRES CESC MERCURY 261 PLEINES ET OPAQUES */}
      {cabinets.map(cab => (
        <group key={cab.id} position={[cab.x, cab.y, cab.z]}>
          {/* Corps principal plein et opaque */}
          <mesh
            geometry={geometries.body}
            material={materials.cabinetBody}
            castShadow
            receiveShadow
          />

          {/* Socle inférieur renforcé RAL 7016 */}
          <mesh
            position={[0, -cabH / 2 + 0.06, 0]}
            geometry={geometries.plinth}
            material={materials.cabinetFrame}
            castShadow
          />

          {/* Chapeau de toit supérieur RAL 7016 */}
          <mesh
            position={[0, cabH / 2 - 0.06, 0]}
            geometry={geometries.roofCap}
            material={materials.cabinetFrame}
            castShadow
          />

          {/* Module de climatisation CVC sur le toit */}
          <group position={[0, cabH / 2 + 0.09, 0]}>
            <mesh
              geometry={geometries.hvacUnit}
              material={materials.cabinetFrame}
              castShadow
            />
            {/* 2 Ventilateurs d'extraction */}
            <mesh
              position={[-0.24, 0.1, 0]}
              geometry={geometries.hvacFan}
              material={materials.grill}
            />
            <mesh
              position={[0.24, 0.1, 0]}
              geometry={geometries.hvacFan}
              material={materials.grill}
            />
          </group>

          {/* DÉTAILS DE LA FAÇADE AVANT (Z = +cabD/2) */}
          <group position={[0, 0, cabD / 2 + 0.005]}>
            {/* Rainure centrale double porte */}
            <mesh
              position={[0, 0, 0]}
              geometry={geometries.doorGroove}
              material={materials.seam}
            />

            {/* Poignées de crémone métalliques inox */}
            <mesh
              position={[-0.08, -0.05, 0.015]}
              geometry={geometries.handle}
              material={materials.handle}
            />
            <mesh
              position={[0.08, -0.05, 0.015]}
              geometry={geometries.handle}
              material={materials.handle}
            />

            {/* Ouïes de ventilation CVC haute */}
            <mesh
              position={[0, cabH / 2 - 0.42, 0.008]}
              geometry={geometries.grillUpper}
              material={materials.grill}
            />

            {/* Grille basse d'admission d'air */}
            <mesh
              position={[0, -cabH / 2 + 0.32, 0.008]}
              geometry={geometries.grillLower}
              material={materials.grill}
            />

            {/* Écran tactile de contrôle IHM */}
            <mesh
              position={[0.26, 0.15, 0.008]}
              geometry={geometries.screen}
              material={materials.screen}
            />

            {/* Voyant d'état LED Vert */}
            <mesh
              position={[0.26, 0.28, 0.008]}
              rotation={[Math.PI / 2, 0, 0]}
              geometry={geometries.led}
              material={materials.ledGreen}
            />

            {/* Bouton d'arrêt d'urgence coup de poing */}
            <mesh
              position={[0.42, 0.15, 0.015]}
              rotation={[Math.PI / 2, 0, 0]}
              geometry={geometries.led}
              material={materials.ledRed}
            />
          </group>

          {/* DÉTAILS DE LA FAÇADE ARRIÈRE (Z = -cabD/2) */}
          <group position={[0, 0, -cabD / 2 - 0.005]}>
            {/* Grilles d'évacuation thermique arrière */}
            <mesh
              position={[0, cabH / 2 - 0.42, -0.008]}
              geometry={geometries.grillUpper}
              material={materials.grill}
            />
            <mesh
              position={[0, -cabH / 2 + 0.32, -0.008]}
              geometry={geometries.grillLower}
              material={materials.grill}
            />
          </group>
        </group>
      ))}

      {/* 3. CLÔTURE RIGIDE MÉTALLIQUE SUR LE BORD EXTÉRIEUR DE LA DALLE */}
      {showFence && (
        <group position={[0, 0, 0]}>
          {/* Poteaux d'angle carrés (4 coins de la dalle) */}
          <mesh
            position={[-dLen / 2 + 0.03, fenceY, -dWid / 2 + 0.03]}
            geometry={geometries.postCorner}
            material={materials.fencePost}
            castShadow
          />
          <mesh
            position={[dLen / 2 - 0.03, fenceY, -dWid / 2 + 0.03]}
            geometry={geometries.postCorner}
            material={materials.fencePost}
            castShadow
          />
          <mesh
            position={[dLen / 2 - 0.03, fenceY, dWid / 2 - 0.03]}
            geometry={geometries.postCorner}
            material={materials.fencePost}
            castShadow
          />
          <mesh
            position={[-dLen / 2 + 0.03, fenceY, dWid / 2 - 0.03]}
            geometry={geometries.postCorner}
            material={materials.fencePost}
            castShadow
          />

          {/* Poteaux intermédiaires le long des grands côtés (longueur 6.20m) */}
          {[-1.55, 0, 1.55].map((posX, idx) => (
            <React.Fragment key={`post-inter-${idx}`}>
              <mesh
                position={[posX, fenceY, -dWid / 2 + 0.03]}
                geometry={geometries.postInter}
                material={materials.fencePost}
                castShadow
              />
              <mesh
                position={[posX, fenceY, dWid / 2 - 0.03]}
                geometry={geometries.postInter}
                material={materials.fencePost}
                castShadow
              />
            </React.Fragment>
          ))}

          {/* Poteaux intermédiaires sur les petits côtés (largeur 3.20m) */}
          <mesh
            position={[-dLen / 2 + 0.03, fenceY, 0]}
            geometry={geometries.postInter}
            material={materials.fencePost}
            castShadow
          />
          <mesh
            position={[dLen / 2 - 0.03, fenceY, 0]}
            geometry={geometries.postInter}
            material={materials.fencePost}
            castShadow
          />

          {/* Lisses horizontales de rigidité (haute à 2.0m et basse à 0.1m au-dessus de la dalle) */}
          {/* Lisses Grand Côté Avant (+Z) */}
          <mesh
            position={[0, slabH + 1.95, dWid / 2 - 0.03]}
            geometry={geometries.railLong}
            material={materials.fencePost}
          />
          <mesh
            position={[0, slabH + 0.15, dWid / 2 - 0.03]}
            geometry={geometries.railLong}
            material={materials.fencePost}
          />

          {/* Lisses Grand Côté Arrière (-Z) */}
          <mesh
            position={[0, slabH + 1.95, -dWid / 2 + 0.03]}
            geometry={geometries.railLong}
            material={materials.fencePost}
          />
          <mesh
            position={[0, slabH + 0.15, -dWid / 2 + 0.03]}
            geometry={geometries.railLong}
            material={materials.fencePost}
          />

          {/* Lisses Petits Côtés Latéraux (Gauche & Droite) */}
          <mesh
            position={[-dLen / 2 + 0.03, slabH + 1.95, 0]}
            geometry={geometries.railShort}
            material={materials.fencePost}
          />
          <mesh
            position={[-dLen / 2 + 0.03, slabH + 0.15, 0]}
            geometry={geometries.railShort}
            material={materials.fencePost}
          />
          <mesh
            position={[dLen / 2 - 0.03, slabH + 1.95, 0]}
            geometry={geometries.railShort}
            material={materials.fencePost}
          />
          <mesh
            position={[dLen / 2 - 0.03, slabH + 0.15, 0]}
            geometry={geometries.railShort}
            material={materials.fencePost}
          />

          {/* Panneaux de grillage rigide (treillis soudé vert) */}
          {/* Face avant (+Z) */}
          <mesh
            position={[0, fenceY, dWid / 2 - 0.03]}
            geometry={geometries.panelLong}
            material={materials.fenceMesh}
          />
          {/* Face arrière (-Z) */}
          <mesh
            position={[0, fenceY, -dWid / 2 + 0.03]}
            geometry={geometries.panelLong}
            material={materials.fenceMesh}
          />
          {/* Face latérale gauche (-X) */}
          <mesh
            position={[-dLen / 2 + 0.03, fenceY, 0]}
            rotation={[0, Math.PI / 2, 0]}
            geometry={geometries.panelShort}
            material={materials.fenceMesh}
          />
          {/* Face latérale droite (+X) avec portillon technique */}
          <mesh
            position={[dLen / 2 - 0.03, fenceY, 0]}
            rotation={[0, Math.PI / 2, 0]}
            geometry={geometries.panelShort}
            material={materials.fenceMesh}
          />

          {/* Poignée et cadre du portillon technique sécurisé */}
          <group position={[dLen / 2 - 0.01, slabH + 1.0, 0.4]}>
            <mesh
              geometry={new THREE.BoxGeometry(0.04, 0.15, 0.03)}
              material={materials.handle}
            />
          </group>
        </group>
      )}
    </group>
  );
}
