import React, { useMemo } from 'react';
import * as THREE from 'three';
import { PortalFrame } from './PortalFrame';
import { generateIPEShape, IPE_Ref } from '../utils/geometry';

export const Structure = ({
    length = 20, // Longueur bâtiment (Z)
    width = 10,  // Largeur bâtiment (Portée/Span) (X)
    height = 5,  // Hauteur égoût (Y)
    pitch = 15,  // Pente toit (degrés)
    baySpacing = 5 // Espacement standard travées
}) => {
    // Calcul nombre de travées
    const bayCount = Math.max(1, Math.round(length / baySpacing));
    const actualSpacing = length / bayCount; // Espacement régulier

    // Génération des portiques
    const frames = [];
    for (let i = 0; i <= bayCount; i++) {
        frames.push(
            <PortalFrame
                key={i}
                span={width}
                height={height}
                pitch={pitch}
                position={[0, 0, i * actualSpacing - length / 2]}
            />
        );
    }

    // --- Système de Pannes (Purlins) ---
    const pitchRad = (pitch * Math.PI) / 180;
    const halfSpan = width / 2;
    // const ridgeHeight = height + (halfSpan * Math.tan(pitchRad)); // Non utilisé ici
    const rafterLength = halfSpan / Math.cos(pitchRad);

    // Espacement pannes (approx 1.3m)
    const purlinSpacing = 1.3;
    const purlinCountPerSide = Math.floor(rafterLength / purlinSpacing);
    const adjustedPurlinSpacing = rafterLength / (purlinCountPerSide + 1);

    // Géométrie Panne (IPE 100 extrudé sur toute la longueur du bâtiment)
    const purlinGeo = useMemo(() => {
        const shape = generateIPEShape(
            IPE_Ref.IPE100.h,
            IPE_Ref.IPE100.b,
            IPE_Ref.IPE100.e,
            IPE_Ref.IPE100.f,
            IPE_Ref.IPE100.r
        );
        return new THREE.ExtrudeGeometry(shape, {
            depth: length,
            bevelEnabled: false,
            steps: 1
        });
    }, [length]);

    const steelMaterial = new THREE.MeshStandardMaterial({
        color: 0x888888,
        metalness: 0.6,
        roughness: 0.5
    });

    // Générer positions pannes
    const purlins = [];

    // Pour chaque côté (Gauche = -1, Droit = 1)
    [-1, 1].forEach(side => {
        for (let j = 1; j <= purlinCountPerSide; j++) {
            // Distance le long de la pente depuis l'égoût
            const distOnSlope = j * adjustedPurlinSpacing;

            const xOffset = distOnSlope * Math.cos(pitchRad);
            const yOffset = distOnSlope * Math.sin(pitchRad);

            const xPos = side === -1 ? (-halfSpan + xOffset) : (halfSpan - xOffset);
            const yPos = height + yOffset;

            // Rotation pour suivre la pente
            // Attention : l'extrusion se fait selon Z (longueur batiment).
            // La rotation doit être autour de Z (axe long) pour incliner le profilé selon la pente du toit.
            // Pente gauche : monte vers droite (+angle). Pente droite : monte vers gauche (-angle).
            // Le profilé IPE est "debout" (Y). On veut qu'il soit perpendiculaire au toit.
            const rotZ = side === -1 ? -pitchRad : pitchRad;

            purlins.push(
                <mesh
                    key={`purlin-${side}-${j}`}
                    geometry={purlinGeo}
                    material={steelMaterial}
                    position={[xPos, yPos + IPE_Ref.IPE100.h / 2 * Math.cos(pitchRad), -length / 2]}
                    rotation={[0, 0, rotZ]}
                    castShadow
                    receiveShadow
                />
            );
        }
    });

    // Pannes faîtières (optionnel, souvent doubles)
    // Pannes sablières (optionnel, souvent sur le poteau)

    return (
        <group>
            {frames}
            {purlins}
        </group>
    );
};
