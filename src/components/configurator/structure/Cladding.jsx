import React, { useMemo } from 'react';
import * as THREE from 'three';
import { createCorrugatedNormalMap } from '../materials/materialUtils';

export const Cladding = ({
    length = 20,
    width = 10,
    height = 5,
    pitch = 15,
    roofColor = '#5c6166', // Gris anthracite 7016
    wallColor = '#d6d6d6', // Blanc grisâtre
}) => {
    // Calculs géométriques
    const pitchRad = (pitch * Math.PI) / 180;
    const halfSpan = width / 2;
    const ridgeHeight = height + (halfSpan * Math.tan(pitchRad));
    const rafterLength = halfSpan / Math.cos(pitchRad);

    // Génération textures procédurales (une seule fois)
    const corrugatedNormalMap = useMemo(() => createCorrugatedNormalMap(), []);

    // Matériau Toiture (Bac acier)
    const roofMaterial = useMemo(() => {
        const mat = new THREE.MeshStandardMaterial({
            color: new THREE.Color(roofColor),
            roughness: 0.4,
            metalness: 0.3, // Peinture métallique
            normalMap: corrugatedNormalMap,
            normalScale: new THREE.Vector2(1, 1),
            side: THREE.DoubleSide
        });
        // Ajustement répétition texture pour échelle réaliste
        // Supposons 1 tile = 1m²
        return mat;
    }, [roofColor, corrugatedNormalMap]);

    // Matériau Murs (Bardage sinusoidal vertical)
    const wallMaterial = useMemo(() => {
        const mat = new THREE.MeshStandardMaterial({
            color: new THREE.Color(wallColor),
            roughness: 0.5,
            metalness: 0.1,
            normalMap: corrugatedNormalMap,
            normalScale: new THREE.Vector2(1, 1),
            side: THREE.DoubleSide
        });
        return mat;
    }, [wallColor, corrugatedNormalMap]);

    // Géométrie Toiture
    // 2 plans inclinés.
    // Plan gauche : rotation Z = pitch, position X = -halfSpan/2, Y = moyenne...
    // Mieux : créer geometry manuellement.

    const roofGeo = useMemo(() => {
        const geometry = new THREE.PlaneGeometry(rafterLength, length);
        // Orienter : par défaut Plane est XY.
        // On veut le coucher. Mais avec la pente.
        return geometry;
    }, [rafterLength, length]);

    // Mise à jour répétition texture par instance
    // Toit : repeat X = rafterLength, Y = length
    const roofMapLeft = corrugatedNormalMap.clone();
    roofMapLeft.wrapS = THREE.RepeatWrapping;
    roofMapLeft.wrapT = THREE.RepeatWrapping;
    roofMapLeft.repeat.set(rafterLength, length / 2); // Ajuster échelle
    roofMapLeft.needsUpdate = true;

    // On doit cloner le material pour appliquer des textures répétées différentes ? 
    // Oui si on veut perfect mapping. Sinon global.
    // Pour simplifier, on applique une echelle globale.

    return (
        <group>
            {/* Toit Gauche */}
            <mesh
                geometry={roofGeo}
                position={[-width / 4, height + (halfSpan / 2 * Math.tan(pitchRad)) + 0.15, 0]}
                rotation={[-Math.PI / 2, 0, pitchRad]} // Couché X, puis Pente Z
                // Attention rotation Z : Plane XY -> Couché X (-90) -> devient XZ.
                // Pente autour de Z(world) ? Non autour de Z local après rotate X ?
                // Si rotate X -90 : Y devient -Z, Z devient Y.
                // On veut tourner autour de l'axe long (Z world, maintenant Y local ?).
                // Rotation d'Euler : Order XYZ.
                // -PI/2 X : plan horizontal.
                // +Pitch Z : plan incliné gauche (monte vers droite).
                // position Y : au milieu de la pente.
                // X : au milieu du demi-span (-width/4).
                castShadow
                receiveShadow
            >
                <meshStandardMaterial
                    {...roofMaterial}
                    normalMap={roofMapLeft} // Clone pour repeat
                />
            </mesh>

            {/* Toit Droit */}
            <mesh
                geometry={roofGeo}
                position={[width / 4, height + (halfSpan / 2 * Math.tan(pitchRad)) + 0.15, 0]}
                rotation={[-Math.PI / 2, 0, -pitchRad]}
                castShadow
                receiveShadow
            >
                <meshStandardMaterial
                    {...roofMaterial}
                    normalMap={roofMapLeft}
                />
            </mesh>

            {/* --- Murs (Bardage) --- */}
            {/* Long-Pan Gauche */}
            <mesh position={[-halfSpan, height / 2, 0]} rotation={[0, -Math.PI / 2, 0]} castShadow receiveShadow>
                <planeGeometry args={[length, height]} />
                <meshStandardMaterial {...wallMaterial} color={wallColor} />
            </mesh>

            {/* Long-Pan Droit */}
            <mesh position={[halfSpan, height / 2, 0]} rotation={[0, Math.PI / 2, 0]} castShadow receiveShadow>
                <planeGeometry args={[length, height]} />
                <meshStandardMaterial {...wallMaterial} color={wallColor} />
            </mesh>

            {/* Pignon Arrière (-Z) */}
            {/* Forme pentagonale : rectangle + triangle */}
            {/* Rectangle bas */}
            <mesh position={[0, height / 2, -length / 2]} rotation={[0, Math.PI, 0]} castShadow receiveShadow>
                <planeGeometry args={[width, height]} />
                <meshStandardMaterial {...wallMaterial} color={wallColor} />
            </mesh>
            {/* Triangle haut */}
            <mesh position={[0, height + (ridgeHeight - height) / 2, -length / 2]} castShadow receiveShadow>
                <coneGeometry args={[width, 0, 0]} /> {/* Trick: cone applati ? non simple triangle plane */}
                <shapeGeometry args={[new THREE.Shape().moveTo(-halfSpan, 0).lineTo(halfSpan, 0).lineTo(0, ridgeHeight - height)]} />
                <meshStandardMaterial {...wallMaterial} color={wallColor} side={THREE.DoubleSide} />
            </mesh>

            {/* Pignon Avant (+Z) */}
            <mesh position={[0, height / 2, length / 2]} castShadow receiveShadow>
                <planeGeometry args={[width, height]} />
                <meshStandardMaterial {...wallMaterial} color={wallColor} />
            </mesh>
            <mesh position={[0, height + (ridgeHeight - height) / 2, length / 2]} castShadow receiveShadow>
                <shapeGeometry args={[new THREE.Shape().moveTo(-halfSpan, - (ridgeHeight - height) / 2).lineTo(halfSpan, - (ridgeHeight - height) / 2).lineTo(0, (ridgeHeight - height) / 2)]} />
                {/* Ajustement shape triangle car position centre */}
                <meshStandardMaterial {...wallMaterial} color={wallColor} side={THREE.DoubleSide} />
            </mesh>

        </group>
    );
};
