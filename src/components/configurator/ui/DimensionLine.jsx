import React from 'react';
import { Line, Text } from '@react-three/drei';
import * as THREE from 'three';

export const DimensionLine = ({
    start,
    end,
    label,
    offset = 0.5, // Décalage par rapport à l'objet mesuré
    color = "black"
}) => {
    // Convert arrays to Vectors
    const vStart = new THREE.Vector3(...start);
    const vEnd = new THREE.Vector3(...end);

    // Calcul direction et normale pour le décalage
    // Par défaut, on décale en Y ou on utilise un vecteur donné.
    // Pour simplifier, on ne gère pas le décalage complexe ici, on suppose que start/end incluent déjà le décalage ou on ajoute une petite translation Y.
    const dir = new THREE.Vector3().subVectors(vEnd, vStart).normalize();
    const mid = new THREE.Vector3().addVectors(vStart, vEnd).multiplyScalar(0.5);

    return (
        <group>
            {/* Ligne principale */}
            <Line
                points={[vStart, vEnd]}
                color={color}
                lineWidth={1}
                dashed={false}
            />

            {/* Flèche Début (Cone ou simple trait perpendiculaire) */}
            {/* Pour faire simple : trait perpendiculaire (tick mark) */}
            {/* On suppose axe horizontal -> tick vertical */}

            {/* Texte (Valeur) */}
            <Text
                position={[mid.x, mid.y + 0.2, mid.z]} // Un peu au dessus du milieu
                fontSize={0.4}
                color={color}
                anchorX="center"
                anchorY="bottom"
                outlineWidth={0.02}
                outlineColor="white"
            >
                {label}
            </Text>
        </group>
    );
};
