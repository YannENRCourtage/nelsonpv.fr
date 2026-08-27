import React, { useMemo } from 'react';
import * as THREE from 'three';

/**
 * BatitechEnclosure — Composant 3D pour le Séchoir BatiTech®
 * - Bardage 3 faces : Sud (long pan bas 4m), Est (pignon avant), Ouest (pignon arrière)
 * - Face Nord ouverte pour circulation et chargement
 * - Local ventilateur d'environ 2m de large par 4m de long avec équipements Cogen'Air®
 */
export function BatitechEnclosure({ width = 20.0, length = 18.0, eaveHeight = 4.0 }) {
    const mainSlope = 15 * (Math.PI / 180);
    const rSpan = width * 0.75; // 15m
    const lSpan = width * 0.25; // 5m
    const apexX = -width * 0.25; // -5m
    const rightEaveH = 4.0; // Sablière Sud
    const ridgeH = rightEaveH + (rSpan * Math.tan(mainSlope)); // ~8.02m
    const leftEaveH = ridgeH - (lSpan * Math.tan(mainSlope)); // ~6.68m

    // Matériau bardage extérieur RAL 7016 Anthracite
    const claddingMaterial = useMemo(() => new THREE.MeshStandardMaterial({
        color: '#475569', // Slate 600 avec texture métallique
        roughness: 0.6,
        metalness: 0.25,
        side: THREE.DoubleSide
    }), []);

    // Matériau local ventilateur (RAL 7035 / Gris technique)
    const localTechMaterial = useMemo(() => new THREE.MeshStandardMaterial({
        color: '#334155',
        roughness: 0.4,
        metalness: 0.3
    }), []);

    const doorMaterial = useMemo(() => new THREE.MeshStandardMaterial({
        color: '#1e293b',
        roughness: 0.5,
        metalness: 0.5
    }), []);

    const fanBlueMaterial = useMemo(() => new THREE.MeshStandardMaterial({
        color: '#2563eb', // Bleu Cogen'Air
        roughness: 0.3,
        metalness: 0.6
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

    // ─── 3. LOCAL VENTILATEUR (2m de large × 4m de long × 2.8m de haut) ──────
    const localWidth = 2.0;
    const localLength = 4.0;
    const localHeight = 2.8;
    const localX = (width / 2) - (localWidth / 2); // Adossé à la face Sud
    const localZ = -0.3 - (localLength / 2);       // Près du pignon Est

    return (
        <group name="batitech-enclosure">
            {/* ═══ 1. BARDAGE LONG PAN SUD (X = +10m) ═══ */}
            <mesh
                geometry={southCladdingGeo}
                material={claddingMaterial}
                position={[width / 2, rightEaveH / 2, -length / 2]}
                castShadow
                receiveShadow
            />

            {/* ═══ 2. BARDAGE PIGNON EST (Z = 0) ═══ */}
            <mesh
                geometry={pignonGeo}
                material={claddingMaterial}
                position={[0, 0, -0.05]}
                castShadow
                receiveShadow
            />

            {/* ═══ 3. BARDAGE PIGNON OUEST (Z = -length) ═══ */}
            <mesh
                geometry={pignonGeo}
                material={claddingMaterial}
                position={[0, 0, -length]}
                castShadow
                receiveShadow
            />

            {/* ═══ 4. LOCAL VENTILATEUR TECHNIQUE (2m × 4m × 2.8m) ═══ */}
            <group position={[localX, localHeight / 2, localZ]}>
                {/* Cabine principale du local */}
                <mesh material={localTechMaterial} castShadow receiveShadow>
                    <boxGeometry args={[localWidth, localHeight, localLength]} />
                </mesh>

                {/* Porte technique (face intérieure Ouest du local) */}
                <mesh position={[-localWidth / 2 - 0.01, -0.2, 0]} rotation={[0, -Math.PI / 2, 0]} material={doorMaterial}>
                    <planeGeometry args={[1.0, 2.1]} />
                </mesh>

                {/* Ventilateur centrifuge Cogen'Air® avec grille de soufflage */}
                <group position={[-localWidth / 2 - 0.02, 0.4, 0.9]} rotation={[0, -Math.PI / 2, 0]}>
                    {/* Anneau de buse */}
                    <mesh material={fanBlueMaterial}>
                        <cylinderGeometry args={[0.45, 0.45, 0.15, 24]} />
                    </mesh>
                    {/* Grille de protection */}
                    <mesh position={[0, 0.08, 0]} material={doorMaterial}>
                        <cylinderGeometry args={[0.42, 0.42, 0.02, 16]} />
                    </mesh>
                </group>

                {/* Toit du local */}
                <mesh position={[0, localHeight / 2 + 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]} material={doorMaterial}>
                    <planeGeometry args={[localWidth - 0.1, localLength - 0.1]} />
                </mesh>
            </group>
        </group>
    );
}
