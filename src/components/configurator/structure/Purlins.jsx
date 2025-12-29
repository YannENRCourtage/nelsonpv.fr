import React, { useMemo, useRef, useLayoutEffect } from 'react';
import * as THREE from 'three';
import { createIPEGeometry, IPE_CATALOG } from '../utils/steelProfiles.js';

/**
 * Crée une géométrie de panne en Z (Z-Purlin)
 * Simplifié en forme rectangulaire pour l'instant
 */
function createZPurlinGeometry(length) {
    // Dimensions typiques panne Z: 200x75mm
    const width = 0.075;
    const height = 0.200;
    const thickness = 0.003;

    // Pour simplifier, on utilise un BoxGeometry étroit
    // TODO: Implémenter la vraie forme en Z plus tard
    return new THREE.BoxGeometry(thickness, height, length);
}

/**
 * Composant Pannes (Purlins) - Éléments secondaires de toiture
 * Utilise InstancedMesh pour optimisation performance
 * 
 * @param {Object} props
 * @param {number} props.span - Portée du bâtiment  
 * @param {number} props.eaveHeight - Hauteur sous égout
 * @param {number} props.roofPitch - Pente toiture en degrés
 * @param {number} props.buildingLength - Longueur totale du bâtiment
 * @param {number} props.purlinSpacing - Espacement entre pannes (défaut 1.2m)
 */
export function Purlins({
    span = 20,
    eaveHeight = 6,
    roofPitch = 15,
    buildingLength = 20,
    purlinSpacing = 1.3
}) {
    const instancedMeshRef = useRef();

    // ========== CALCULS GÉOMÉTRIQUES ==========

    const pitchRad = useMemo(() => (roofPitch * Math.PI) / 180, [roofPitch]);
    const halfSpan = useMemo(() => span / 2, [span]);

    // Longueur du rampant (pente)
    const rafterSlope = useMemo(
        () => halfSpan / Math.cos(pitchRad),
        [halfSpan, pitchRad]
    );

    // Nombre de pannes par versant
    const purlinCountPerSide = useMemo(
        () => Math.max(1, Math.floor(rafterSlope / purlinSpacing)),
        [rafterSlope, purlinSpacing]
    );

    // Espacement ajusté pour répartition uniforme
    const adjustedSpacing = useMemo(
        () => rafterSlope / (purlinCountPerSide + 1),
        [rafterSlope, purlinCountPerSide]
    );

    const totalPurlins = purlinCountPerSide * 2; // 2 versants

    // ========== GÉOMÉTRIE & MATÉRIAU ==========

    const purlinGeo = useMemo(() => createZPurlinGeometry(buildingLength), [buildingLength]);

    const purlinMaterial = useMemo(
        () => (
            <meshStandardMaterial
                color="#999999"
                metalness={0.6}
                roughness={0.4}
            />
        ),
        []
    );

    // ========== CALCUL DES POSITIONS ==========

    const purlinPositions = useMemo(() => {
        const positions = [];

        // Boucle sur les 2 versants
        [-1, 1].forEach(side => {
            // side = -1 (gauche), side = 1 (droit)

            for (let i = 1; i <= purlinCountPerSide; i++) {
                // Distance le long de la pente depuis l'égoût
                const distOnSlope = i * adjustedSpacing;

                // Coordonnées X et Y (trigonométrie)
                const xOffset = distOnSlope * Math.cos(pitchRad);
                const yOffset = distOnSlope * Math.sin(pitchRad);

                // Position finale
                const x = side === -1 ? (-halfSpan + xOffset) : (halfSpan - xOffset);
                const y = eaveHeight + yOffset;
                const z = 0; // Centre du bâtiment (longueur)

                // Angle de rotation (suivre la pente)
                const rotationZ = side === -1 ? -pitchRad : pitchRad;

                positions.push({
                    position: new THREE.Vector3(x, y, z),
                    rotation: new THREE.Euler(-Math.PI / 2, 0, rotationZ)
                });
            }
        });

        return positions;
    }, [purlinCountPerSide, adjustedSpacing, pitchRad, halfSpan, eaveHeight]);

    // ========== MISE À JOUR DES INSTANCES ==========

    useLayoutEffect(() => {
        if (!instancedMeshRef.current) return;

        const tempMatrix = new THREE.Matrix4();
        const tempObject = new THREE.Object3D();

        purlinPositions.forEach((purlin, index) => {
            tempObject.position.copy(purlin.position);
            tempObject.rotation.copy(purlin.rotation);
            tempObject.updateMatrix();

            instancedMeshRef.current.setMatrixAt(index, tempObject.matrix);
        });

        instancedMeshRef.current.instanceMatrix.needsUpdate = true;
    }, [purlinPositions]);

    // ========== RENDU ==========

    return (
        <instancedMesh
            ref={instancedMeshRef}
            args={[purlinGeo, purlinMaterial, totalPurlins]}
            castShadow
            receiveShadow
        />
    );
}
