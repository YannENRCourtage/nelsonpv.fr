import React, { useMemo } from 'react';
import * as THREE from 'three';
import { createIPEGeometry, IPE_CATALOG } from '../utils/steelProfiles.js';

/**
 * Crée la géométrie d'un gousset (haunch) trapézoïdal
 * Renfort structural à la jonction poteau-arbalétrier
 */
function createHaunchGeometry(length, heightStart, heightEnd, width) {
    const shape = new THREE.Shape();

    // Profil trapézoïdal (vue de côté)
    shape.moveTo(0, 0);
    shape.lineTo(length, 0);
    shape.lineTo(length, heightEnd);
    shape.lineTo(0, heightStart);
    shape.closePath();

    return new THREE.ExtrudeGeometry(shape, {
        depth: width,
        bevelEnabled: false
    });
}

/**
 * Composant Portique (Portal Frame) - Structure métallique de base
 * 
 * @param {Object} props
 * @param {number} props.span - Portée du bâtiment (largeur) en mètres
 * @param {number} props.eaveHeight - Hauteur sous égout en mètres
 * @param {number} props.roofPitch - Pente de toiture en degrés
 * @param {string} props.columnProfile - Profilé IPE pour poteaux (ex: 'IPE450')
 * @param {string} props.rafterProfile - Profilé IPE pour arbalétriers (ex: 'IPE360')
 * @param {THREE.Vector3} props.position - Position du portique dans la scène
 */
export function PortalFrame({
    span = 20,
    eaveHeight = 6,
    roofPitch = 15,
    columnProfile = 'IPE450',
    rafterProfile = 'IPE360',
    position = [0, 0, 0]
}) {
    // ========== CALCULS TRIGONOMÉTRIQUES ==========

    const pitchRad = useMemo(() => (roofPitch * Math.PI) / 180, [roofPitch]);
    const halfSpan = useMemo(() => span / 2, [span]);

    // Hauteur du faîtage (ridge)
    const ridgeHeight = useMemo(
        () => eaveHeight + (halfSpan * Math.tan(pitchRad)),
        [eaveHeight, halfSpan, pitchRad]
    );

    // Longueur des arbalétriers (distance projetée sur la pente)
    const rafterLength = useMemo(
        () => halfSpan / Math.cos(pitchRad),
        [halfSpan, pitchRad]
    );

    // Longueur du gousset (10% de la longueur de l'arbalétrier)
    const haunchLength = useMemo(() => rafterLength * 0.10, [rafterLength]);

    // ========== GÉNÉRATION DES GÉOMÉTRIES ==========

    const geometries = useMemo(() => {
        // Poteaux (colonnes verticales)
        const columnGeo = createIPEGeometry(columnProfile, eaveHeight);

        // Arbalétriers (rafters inclinés)
        const rafterGeo = createIPEGeometry(rafterProfile, rafterLength);

        // Goussets (haunches) - Dimensions du profilé IPE pour le width
        const rafterProfileData = IPE_CATALOG[rafterProfile] || IPE_CATALOG.IPE360;
        const haunchGeo = createHaunchGeometry(
            haunchLength,
            rafterProfileData.h * 0.7, // Hauteur début gousset
            rafterProfileData.h * 0.3, // Hauteur fin gousset (dégressif)
            rafterProfileData.b // Largeur = largeur semelle
        );

        return {
            column: columnGeo,
            rafter: rafterGeo,
            haunch: haunchGeo
        };
    }, [columnProfile, rafterProfile, eaveHeight, rafterLength, haunchLength]);

    // ========== MATÉRIAU ACIER ==========

    const steelMaterial = useMemo(
        () => (
            <meshStandardMaterial
                color="#888888"
                metalness={0.7}
                roughness={0.3}
                envMapIntensity={1.2}
            />
        ),
        []
    );

    // ========== RENDU DU PORTIQUE ==========

    return (
        <group position={position}>
            {/* ===== POTEAU GAUCHE ===== */}
            <mesh
                geometry={geometries.column}
                material={steelMaterial}
                position={[-halfSpan, 0, 0]}
                rotation={[-Math.PI / 2, 0, 0]} // Debout (extrusion Z → Y)
                castShadow
                receiveShadow
            />

            {/* ===== POTEAU DROIT ===== */}
            <mesh
                geometry={geometries.column}
                material={steelMaterial}
                position={[halfSpan, 0, 0]}
                rotation={[-Math.PI / 2, 0, 0]}
                castShadow
                receiveShadow
            />

            {/* ===== ARBALÉTRIER GAUCHE ===== */}
            <group position={[-halfSpan, eaveHeight, 0]}>
                <mesh
                    geometry={geometries.rafter}
                    material={steelMaterial}
                    rotation={[-Math.PI / 2, pitchRad, 0]} // Couché + rotation pente
                    castShadow
                    receiveShadow
                />

                {/* Gousset gauche */}
                <mesh
                    geometry={geometries.haunch}
                    material={steelMaterial}
                    position={[0, -0.1, 0]}
                    rotation={[0, 0, pitchRad]}
                    castShadow
                />
            </group>

            {/* ===== ARBALÉTRIER DROIT ===== */}
            <group position={[halfSpan, eaveHeight, 0]}>
                <mesh
                    geometry={geometries.rafter}
                    material={steelMaterial}
                    rotation={[-Math.PI / 2, Math.PI - pitchRad, 0]} // Symétrie pente
                    castShadow
                    receiveShadow
                />

                {/* Gousset droit */}
                <mesh
                    geometry={geometries.haunch}
                    material={steelMaterial}
                    position={[0, -0.1, 0]}
                    rotation={[0, 0, Math.PI - pitchRad]}
                    castShadow
                />
            </group>

            {/* ===== LIGNE DE FAÎTAGE (optionnelle, pour debug) ===== */}
            {process.env.NODE_ENV === 'development' && (
                <mesh position={[0, ridgeHeight, 0]}>
                    <sphereGeometry args={[0.1, 8, 8]} />
                    <meshBasicMaterial color="red" />
                </mesh>
            )}
        </group>
    );
}
