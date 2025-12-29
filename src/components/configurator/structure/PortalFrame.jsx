import React, { useMemo } from 'react';
import * as THREE from 'three';
import { generateIPEShape, IPE_Ref } from '../utils/geometry';

export const PortalFrame = ({
    span = 20,
    height = 6,
    pitch = 10, // degrés
    profileColumn = 'IPE450',
    profileRafter = 'IPE360',
    position = [0, 0, 0]
}) => {
    // Conversion pente en radians
    const pitchRad = (pitch * Math.PI) / 180;

    // Calculs géométriques trigonométriques
    const halfSpan = span / 2;
    const ridgeHeight = height + (halfSpan * Math.tan(pitchRad));
    const rafterLength = halfSpan / Math.cos(pitchRad); // Longueur hypoténuse

    // Génération des géométries (mémoïsées pour la performance)
    const { columnGeo, rafterGeo } = useMemo(() => {
        // 1. Poteaux (Columns)
        const colShape = generateIPEShape(
            IPE_Ref[profileColumn].h,
            IPE_Ref[profileColumn].b,
            IPE_Ref[profileColumn].e,
            IPE_Ref[profileColumn].f,
            IPE_Ref[profileColumn].r
        );

        const colExtrudeSettings = {
            depth: height,
            bevelEnabled: false,
            steps: 1
        };
        const cGeo = new THREE.ExtrudeGeometry(colShape, colExtrudeSettings);
        // Centrer le pivot au milieu de la base de l'âme ?
        // Par défaut Extrude extrude sur Z. Mieux vaut orienter pour que Y soit la hauteur.
        // Ici on extrude sur Z=height. On va tourner l'objet pour qu'il soit debout.

        // 2. Arbalétriers (Rafters)
        const rafShape = generateIPEShape(
            IPE_Ref[profileRafter].h,
            IPE_Ref[profileRafter].b,
            IPE_Ref[profileRafter].e,
            IPE_Ref[profileRafter].f,
            IPE_Ref[profileRafter].r
        );
        const rafExtrudeSettings = {
            depth: rafterLength,
            bevelEnabled: false,
            steps: 1
        };
        const rGeo = new THREE.ExtrudeGeometry(rafShape, rafExtrudeSettings);

        return { columnGeo: cGeo, rafterGeo: rGeo };

    }, [height, rafterLength, profileColumn, profileRafter]);

    // Matériau temporaire (acier gris standard)
    const steelMaterial = new THREE.MeshStandardMaterial({
        color: 0x888888,
        metalness: 0.6,
        roughness: 0.5
    });

    return (
        <group position={position}>
            {/* Poteau Gauche */}
            <mesh
                geometry={columnGeo}
                material={steelMaterial}
                position={[-halfSpan, 0, 0]}
                rotation={[-Math.PI / 2, 0, 0]} // Debout (Z devient Y) -> Attention orientation profil
            // Si profilShape est XY, extrude Z. Rotation -90 X => Z devient Y (Hauteur).
            // ProfilShape XY est le plan au sol.
            // Il faut tourner le profil pour que l'âme soit // à Z (axe long du bâtiment).
            // geometry.js dessine un I centré. Si on extrude Z, le I est à plat.
            // Poteau vertical : I doit être orienté selon l'axe du portique ou l'axe du bâtiment?
            // Généralement âme perpendiculaire au vent (grand axe inertie dans le plan du portique).
            // Donc âme dans le plan XY (portique).
            // geometry.js dessine I "vertical" (Ame selon Y shape).
            // Si on rotate -PI/2 X, l'âme est dans plan YZ world (perpendiculaire portique).
            // C'est l'inertie faible. C'est MAUVAIS.
            // On veut l'inertie forte dans le plan du portique.
            // Donc faut tourner le profil de 90° Z avant extrusion OU après.
            // On va régler ça avec une rotation mesh.
            >
                {/* Ajustement orientation profilé pour inertie forte */}
                {/* Rotation locale pour mettre l'âme // axe X (plan portique) */}
            </mesh>

            {/* Pour simplifier, je réimplémente le mesh avec les bonnes rotations */}

            {/* Poteau Gauche (Inertie Forte dans plan XZ ?) Non plan XY du portique */}
            {/* Le I doit être "debout" vu de dessus. I */}
            <mesh geometry={columnGeo} material={steelMaterial}
                position={[-halfSpan, 0, 0]}
                rotation={[-Math.PI / 2, 0, -Math.PI / 2]}
                castShadow
                receiveShadow
            />

            {/* Poteau Droit */}
            <mesh geometry={columnGeo} material={steelMaterial}
                position={[halfSpan, 0, 0]}
                rotation={[-Math.PI / 2, 0, -Math.PI / 2]}
                castShadow
                receiveShadow
            />

            {/* Arbalétrier Gauche */}
            <group position={[-halfSpan, height, 0]}>
                <mesh geometry={rafterGeo} material={steelMaterial}
                    rotation={[-Math.PI / 2, pitchRad, -Math.PI / 2]} // Rotation pente + orientation profil
                    // position={[0, -IPE_Ref[profileRafter].h / 2, 0]} // Ajustement connexion ?
                    castShadow
                    receiveShadow
                />
            </group>

            {/* Arbalétrier Droit */}
            <group position={[halfSpan, height, 0]}>
                <mesh geometry={rafterGeo} material={steelMaterial}
                    rotation={[-Math.PI / 2, Math.PI - pitchRad, -Math.PI / 2]}
                    // position décalée pour partir du bord vers le faîtage
                    // Si on part de halfSpan, faut aller vers 0.
                    // Rotation Math.PI - pitchRad devrait pointer vers l'intérieur.
                    castShadow
                    receiveShadow
                />
            </group>

            {/* Faîtage (Apex) Connection Plate ? (Optionnel) */}
        </group>
    );
};
