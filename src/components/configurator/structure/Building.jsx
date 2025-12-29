import React, { useMemo } from 'react';
import { PortalFrame } from './PortalFrame.jsx';
import { Purlins } from './Purlins.jsx';

/**
 * Composant Building - Assembl age complet de la structure métallique
 * Gère la répétition des portiques selon la longueur du bâtiment
 * 
 * @param {Object} props
 * @param {number} props.span - Largeur du bâtiment (m)
 * @param {number} props.length - Longueur du bâtiment (m)
 * @param {number} props.eaveHeight - Hauteur sous égout (m)
 * @param {number} props.roofPitch - Pente toiture (degrés)
 * @param {number} props.baySpacing - Espacement entre portiques (m)
 * @param {string} props.columnProfile - Profilé poteaux
 * @param {string} props.rafterProfile - Profilé arbalétriers
 */
export function Building({
    span = 20,
    length = 20,
    eaveHeight = 6,
    roofPitch = 15,
    baySpacing = 5,
    columnProfile = 'IPE450',
    rafterProfile = 'IPE360'
}) {
    // ========== CALCUL DU NOMBRE DE TRAVÉES ==========

    const bayCount = useMemo(
        () => Math.max(1, Math.round(length / baySpacing)),
        [length, baySpacing]
    );

    const actualSpacing = useMemo(
        () => length / bayCount,
        [length, bayCount]
    );

    // ========== GÉNÉRATION DES PORTIQUES ==========

    const portalFrames = useMemo(() => {
        const frames = [];

        // Générer N+1 portiques (début, milieu, fin)
        for (let i = 0; i <= bayCount; i++) {
            const zPosition = (i * actualSpacing) - (length / 2); // Centré sur 0

            frames.push(
                <PortalFrame
                    key={`portal-${i}`}
                    span={span}
                    eaveHeight={eaveHeight}
                    roofPitch={roofPitch}
                    columnProfile={columnProfile}
                    rafterProfile={rafterProfile}
                    position={[0, 0, zPosition]}
                />
            );
        }

        return frames;
    }, [bayCount, actualSpacing, length, span, eaveHeight, roofPitch, columnProfile, rafterProfile]);

    // ========== RENDU ==========

    return (
        <group>
            {/* Portiques */}
            {portalFrames}

            {/* Pannes */}
            <Purlins
                span={span}
                eaveHeight={eaveHeight}
                roofPitch={roofPitch}
                buildingLength={length}
                purlinSpacing={1.3}
            />
        </group>
    );
}
