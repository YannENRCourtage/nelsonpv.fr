import React, { useMemo } from 'react';
import * as THREE from 'three';

/**
 * BatitechEnclosure — Composant 3D pour le Séchoir BatiTech®
 * - Bardage 3 faces métallique nervuré : Sud (long pan 4m), Est (pignon avant), Ouest (pignon arrière)
 * - Face Nord ouverte pour circulation et logistique de foin
 * - Cellules de séchage intérieures (15m de profondeur de X = -5m à X = +10m) avec murs béton et lit de foin/fourrage
 * - Locaux ventilateurs extérieurs devant la façade Sud
 * - Ligne d'embases aérauliques en toiture sur toute la longueur du bâtiment sous les panneaux Cogen'Air®
 */
export function BatitechEnclosure({ width = 20.0, length = 18.0, eaveHeight = 4.0, hasSolar = true }) {
    const mainSlope = 15 * (Math.PI / 180);
    const rSpan = width * 0.75; // 15m
    const lSpan = width * 0.25; // 5m
    const apexX = -width * 0.25; // -5m
    const rightEaveH = 4.0; // Sablière Sud (X = +10m)
    const ridgeH = rightEaveH + (rSpan * Math.tan(mainSlope)); // ~8.02m
    const leftEaveH = ridgeH - (lSpan * Math.tan(mainSlope)); // ~6.68m

    // Détermination des cellules de séchage et des locaux ventilateurs selon la longueur du modèle
    // BatiTech 3.1.15 (18m -> 1 cellule), BatiTech 6.2.15 (36m -> 2 cellules), BatiTech 8.3.15 (48m -> 3 cellules)
    const { dryingCells, fanRooms, embaseCount } = useMemo(() => {
        let cells = [];
        let fans = [];
        let embases = 10;

        if (length <= 20) {
            // BatiTech 3.1.15 (18m - 3 travées de 6m : [0..6], [6..12], [12..18])
            // 1 cellule sur la 3ème travée (Z: -18m à -12m)
            cells = [
                { id: 'cell-1', zStart: -18, zEnd: -12, zCenter: -15 }
            ];
            // 1 local ventilateur extérieur centré devant la cellule à Z = -15m
            fans = [
                { id: 'fan-1', zCenter: -15, length: 4.0 }
            ];
            embases = 10;
        } else if (length <= 38) {
            // BatiTech 6.2.15 (36m - 6 travées de 6m)
            // 2 cellules groupées au centre (travées 3 et 4, Z: -24m à -12m)
            cells = [
                { id: 'cell-1', zStart: -18, zEnd: -12, zCenter: -15 },
                { id: 'cell-2', zStart: -24, zEnd: -18, zCenter: -21 }
            ];
            // 1 double local ventilateur extérieur centré au milieu du bâtiment (Z = -18m)
            fans = [
                { id: 'fan-double', zCenter: -18, length: 8.0 }
            ];
            embases = 21;
        } else {
            // BatiTech 8.3.15 (48m - 8 travées de 6m)
            // 3 cellules : 2 groupées au centre (Z: -24m à -12m) + 1 cellule d'extrémité (Z: -48m à -42m)
            cells = [
                { id: 'cell-1', zStart: -18, zEnd: -12, zCenter: -15 },
                { id: 'cell-2', zStart: -24, zEnd: -18, zCenter: -21 },
                { id: 'cell-3', zStart: -48, zEnd: -42, zCenter: -45 }
            ];
            // 1 double local ventilateur au milieu (Z = -18m) + 1 local ventilateur à Z = -45m
            fans = [
                { id: 'fan-double', zCenter: -18, length: 8.0 },
                { id: 'fan-single', zCenter: -45, length: 4.0 }
            ];
            embases = 28;
        }

        return { dryingCells: cells, fanRooms: fans, embaseCount: embases };
    }, [length]);

    // ─── MATÉRIAUX ──────────────────────────────────────────────────────────
    // Bardage métallique RAL 7016 Anthracite
    const metalCladdingMaterial = useMemo(() => new THREE.MeshStandardMaterial({
        color: '#334155', // Slate 700 / RAL 7016
        roughness: 0.35,
        metalness: 0.65,
        side: THREE.DoubleSide
    }), []);

    // Nervures verticales en relief pour l'aspect bac acier
    const ribMaterial = useMemo(() => new THREE.MeshStandardMaterial({
        color: '#1e293b',
        roughness: 0.3,
        metalness: 0.8
    }), []);

    // Murs de séparation des cellules en béton banché
    const concreteMaterial = useMemo(() => new THREE.MeshStandardMaterial({
        color: '#94a3b8',
        roughness: 0.9,
        metalness: 0.1
    }), []);

    // Lit de fourrage / foin vert doré
    const hayMaterial = useMemo(() => new THREE.MeshStandardMaterial({
        color: '#849a46', // Foin vert doré séché
        roughness: 0.95,
        metalness: 0.05
    }), []);

    // Plafond OSB de séchage sous toiture
    const osbWoodMaterial = useMemo(() => new THREE.MeshStandardMaterial({
        color: '#b08958', // Bois OSB chaleureux
        roughness: 0.85,
        metalness: 0.1
    }), []);

    // Local ventilateur extérieur
    const fanRoomWallMaterial = useMemo(() => new THREE.MeshStandardMaterial({
        color: '#3f4b5b',
        roughness: 0.4,
        metalness: 0.5
    }), []);

    const fanRoomRoofMaterial = useMemo(() => new THREE.MeshStandardMaterial({
        color: '#1e293b',
        roughness: 0.3,
        metalness: 0.7
    }), []);

    const doorMaterial = useMemo(() => new THREE.MeshStandardMaterial({
        color: '#0f172a',
        roughness: 0.5,
        metalness: 0.4
    }), []);

    // Embases en toiture (caissons métalliques de reprise d'air)
    const embaseMaterial = useMemo(() => new THREE.MeshStandardMaterial({
        color: '#e2e8f0', // Gris clair / tôle galvanisée
        roughness: 0.25,
        metalness: 0.8
    }), []);

    const embaseGrilleMaterial = useMemo(() => new THREE.MeshStandardMaterial({
        color: '#1e293b',
        roughness: 0.5,
        metalness: 0.5
    }), []);

    // ─── 1. GÉOMÉTRIE DU BARDAGE PIGNON (EST & OUEST) ────────────────────────
    const pignonShape = useMemo(() => {
        const shape = new THREE.Shape();
        const leftX = -width / 2; // -10m
        const rightX = width / 2;  // +10m

        shape.moveTo(leftX, 0);
        shape.lineTo(rightX, 0);
        shape.lineTo(rightX, rightEaveH);
        shape.lineTo(apexX, ridgeH);
        shape.lineTo(leftX, leftEaveH);
        shape.closePath();

        return shape;
    }, [width, rightEaveH, apexX, ridgeH, leftEaveH]);

    const pignonGeo = useMemo(() => new THREE.ExtrudeGeometry(pignonShape, {
        depth: 0.05,
        bevelEnabled: false
    }), [pignonShape]);

    // ─── 2. GÉOMÉTRIE DU BARDAGE LONG PAN SUD (SABLIÈRE 4M) ─────────────────
    const southCladdingGeo = useMemo(() => {
        return new THREE.BoxGeometry(0.06, rightEaveH, length);
    }, [rightEaveH, length]);

    // Génération des nervures métalliques 3D pour la façade Sud
    const southRibs = useMemo(() => {
        const ribs = [];
        const ribSpacing = 0.50; // Une nervure tous les 50cm
        const count = Math.floor(length / ribSpacing);
        for (let i = 0; i <= count; i++) {
            const zPos = -i * ribSpacing;
            ribs.push(zPos);
        }
        return ribs;
    }, [length]);

    // Génération des nervures métalliques 3D pour les pignons
    const pignonRibs = useMemo(() => {
        const ribs = [];
        const ribSpacing = 0.50;
        for (let x = -width / 2 + 0.25; x <= width / 2 - 0.25; x += ribSpacing) {
            // Calcul de la hauteur maximale à cette coordonnée X
            let h = rightEaveH;
            if (x < apexX) {
                // Pente gauche de leftX (-10) à apexX (-5)
                const ratio = (x - (-width / 2)) / (apexX - (-width / 2));
                h = leftEaveH + ratio * (ridgeH - leftEaveH);
            } else {
                // Pente droite de apexX (-5) à rightX (+10)
                const ratio = (width / 2 - x) / (width / 2 - apexX);
                h = rightEaveH + ratio * (ridgeH - rightEaveH);
            }
            ribs.push({ x, h });
        }
        return ribs;
    }, [width, apexX, leftEaveH, rightEaveH, ridgeH]);

    // ─── 3. EMBASES DE TOITURE AÉRAULIQUES (SUR RAMPANT SUD) ─────────────────
    const embaseCoords = useMemo(() => {
        const coords = [];
        const step = (length - 1.0) / Math.max(1, embaseCount - 1);
        // Position en X sur la pente Sud (à environ 5.5m, soit à mi-hauteur du grand pan Sud)
        const embaseX = 5.0;
        // Hauteur de la toiture à X = 5.0m
        const slopeY = rightEaveH + ((width / 2 - embaseX) * Math.tan(mainSlope)) + 0.52;

        for (let i = 0; i < embaseCount; i++) {
            const zPos = -0.5 - (i * step);
            coords.push({ x: embaseX, y: slopeY, z: zPos });
        }
        return coords;
    }, [length, embaseCount, width, rightEaveH, mainSlope]);

    return (
        <group name="batitech-enclosure">
            {/* ═════════════════════════════════════════════════════════════════ */}
            {/* 1. BARDAGE EXTÉRIEUR MÉTALLIQUE NERVURÉ 3 FACES                  */}
            {/* ═════════════════════════════════════════════════════════════════ */}

            {/* Long Pan Sud (X = +10m) */}
            <mesh
                geometry={southCladdingGeo}
                material={metalCladdingMaterial}
                position={[width / 2, rightEaveH / 2, -length / 2]}
                castShadow
                receiveShadow
            />

            {/* Nervures métalliques verticales en relief sur Long Pan Sud */}
            {southRibs.map((zPos, idx) => (
                <mesh
                    key={`south-rib-${idx}`}
                    position={[width / 2 + 0.04, rightEaveH / 2, zPos]}
                    material={ribMaterial}
                >
                    <boxGeometry args={[0.03, rightEaveH, 0.04]} />
                </mesh>
            ))}

            {/* Pignon Est (Z = 0) */}
            <mesh
                geometry={pignonGeo}
                material={metalCladdingMaterial}
                position={[0, 0, -0.05]}
                castShadow
                receiveShadow
            />
            {pignonRibs.map((rib, idx) => (
                <mesh
                    key={`pignon-est-rib-${idx}`}
                    position={[rib.x, rib.h / 2, 0.01]}
                    material={ribMaterial}
                >
                    <boxGeometry args={[0.04, rib.h, 0.03]} />
                </mesh>
            ))}

            {/* Pignon Ouest (Z = -length) */}
            <mesh
                geometry={pignonGeo}
                material={metalCladdingMaterial}
                position={[0, 0, -length]}
                castShadow
                receiveShadow
            />
            {pignonRibs.map((rib, idx) => (
                <mesh
                    key={`pignon-ouest-rib-${idx}`}
                    position={[rib.x, rib.h / 2, -length - 0.01]}
                    material={ribMaterial}
                >
                    <boxGeometry args={[0.04, rib.h, 0.03]} />
                </mesh>
            ))}

            {/* ═════════════════════════════════════════════════════════════════ */}
            {/* 2. CELLULES DE SÉCHAGE INTÉRIEURES (15m de profondeur)          */}
            {/*    Profondeur de X = -5m (Apex) à X = +10m (Mur Sud) = 15m       */}
            {/* ═════════════════════════════════════════════════════════════════ */}
            {dryingCells.map((cell) => {
                const cellDepth = 15.0; // 15m de profondeur
                const cellWidth = 5.8;  // Largeur dans la travée de 6m
                const cellCenterX = 2.5; // Milieu entre -5m et +10m : (-5 + 10)/2 = 2.5m
                const wallH = 1.80;     // Hauteur mur béton

                return (
                    <group key={cell.id} name={cell.id}>
                        {/* Mur de séparation béton Ouest de la cellule */}
                        <mesh
                            position={[cellCenterX, wallH / 2, cell.zStart + 0.1]}
                            material={concreteMaterial}
                            castShadow
                            receiveShadow
                        >
                            <boxGeometry args={[cellDepth, wallH, 0.20]} />
                        </mesh>

                        {/* Mur de séparation béton Est de la cellule */}
                        <mesh
                            position={[cellCenterX, wallH / 2, cell.zEnd - 0.1]}
                            material={concreteMaterial}
                            castShadow
                            receiveShadow
                        >
                            <boxGeometry args={[cellDepth, wallH, 0.20]} />
                        </mesh>

                        {/* Lit de séchage / Fourrage foin vert doré */}
                        <mesh
                            position={[cellCenterX, 0.65, cell.zCenter]}
                            material={hayMaterial}
                            castShadow
                            receiveShadow
                        >
                            <boxGeometry args={[cellDepth - 0.2, 1.3, cellWidth - 0.3]} />
                        </mesh>

                        {/* Bottes de foin carrées en rangées visibles sur le dessus */}
                        {[-1.5, 0, 1.5].map((zOffset, bIdx) => (
                            <mesh
                                key={`bale-${bIdx}`}
                                position={[cellCenterX, 1.45, cell.zCenter + zOffset]}
                                material={hayMaterial}
                                castShadow
                            >
                                <boxGeometry args={[cellDepth - 0.6, 0.35, 1.2]} />
                            </mesh>
                        ))}

                        {/* Plafond de séchage en bois OSB sous le toit au-dessus de la cellule */}
                        <mesh
                            position={[cellCenterX, 4.8, cell.zCenter]}
                            rotation={[0, 0, -mainSlope]}
                            material={osbWoodMaterial}
                            castShadow
                        >
                            <boxGeometry args={[cellDepth, 0.05, cellWidth]} />
                        </mesh>
                    </group>
                );
            })}

            {/* ═════════════════════════════════════════════════════════════════ */}
            {/* 3. LOCAUX VENTILATEURS EXTÉRIEURS DEVANT LA FAÇADE SUD          */}
            {/*    En saillie à l'extérieur : de X = +10m à X = +12.4m           */}
            {/* ═════════════════════════════════════════════════════════════════ */}
            {fanRooms.map((room) => {
                const roomDepth = 2.4;  // 2.4m de saillie extérieure
                const roomHeight = 3.2; // 3.2m de hauteur sous sablière
                const roomX = (width / 2) + (roomDepth / 2); // X = +10m + 1.2m = +11.2m

                return (
                    <group key={room.id} position={[roomX, 0, room.zCenter]}>
                        {/* Murs du local technique */}
                        <mesh
                            position={[0, roomHeight / 2, 0]}
                            material={fanRoomWallMaterial}
                            castShadow
                            receiveShadow
                        >
                            <boxGeometry args={[roomDepth, roomHeight, room.length]} />
                        </mesh>

                        {/* Toiture inclinée du local ventilateur */}
                        <mesh
                            position={[0, roomHeight + 0.08, 0]}
                            rotation={[0, 0, 0.12]}
                            material={fanRoomRoofMaterial}
                            castShadow
                        >
                            <boxGeometry args={[roomDepth + 0.3, 0.10, room.length + 0.3]} />
                        </mesh>

                        {/* Portes d'accès extérieures avec encadrement */}
                        {room.length > 5 ? (
                            // Double porte pour local double
                            <>
                                <mesh position={[roomDepth / 2 + 0.01, 1.05, -1.8]} material={doorMaterial}>
                                    <planeGeometry args={[1.0, 2.1]} />
                                </mesh>
                                <mesh position={[roomDepth / 2 + 0.01, 1.05, 1.8]} material={doorMaterial}>
                                    <planeGeometry args={[1.0, 2.1]} />
                                </mesh>
                            </>
                        ) : (
                            // Simple porte pour local simple
                            <mesh position={[roomDepth / 2 + 0.01, 1.05, 0]} material={doorMaterial}>
                                <planeGeometry args={[1.0, 2.1]} />
                            </mesh>
                        )}

                        {/* Bandeau d'identification BatiTech / Cogen'Air */}
                        <mesh position={[roomDepth / 2 + 0.02, 2.5, 0]} material={embaseMaterial}>
                            <planeGeometry args={[0.01, 0.6]} />
                        </mesh>
                    </group>
                );
            })}

            {/* ═════════════════════════════════════════════════════════════════ */}
            {/* 4. EMBASES AÉRAULIQUES EN TOITURE (LIGNE CONTINUE SOUS PV)      */}
            {/* ═════════════════════════════════════════════════════════════════ */}
            {hasSolar && embaseCoords.map((embase, idx) => (
                <group
                    key={`embase-${idx}`}
                    position={[embase.x, embase.y, embase.z]}
                    rotation={[0, 0, -mainSlope]}
                >
                    {/* Cadre de l'embase en tôle métallique */}
                    <mesh material={embaseMaterial} castShadow>
                        <boxGeometry args={[1.3, 0.08, 0.85]} />
                    </mesh>
                    {/* Grille / Caisson de captage d'air chaud */}
                    <mesh position={[0, 0.05, 0]} material={embaseGrilleMaterial}>
                        <boxGeometry args={[1.1, 0.04, 0.70]} />
                    </mesh>
                </group>
            ))}
        </group>
    );
}
