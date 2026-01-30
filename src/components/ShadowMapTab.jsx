import React from 'react';

export default function ShadowMapTab({ project }) {
    if (!project?.gps) {
        return (
            <div className="flex items-center justify-center h-full bg-gray-50">
                <div className="text-center p-6 bg-white rounded-lg shadow-md max-w-md">
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">Coordonnées manquantes</h3>
                    <p className="text-gray-600">
                        Impossible d'afficher la simulation d'ombre car les coordonnées GPS du projet ne sont pas définies.
                        Veuillez renseigner une adresse ou positionner le projet sur la carte.
                    </p>
                </div>
            </div>
        );
    }

    const [lat, lng] = project.gps.split(',').map(s => s.trim());
    const time = Date.now();

    // URL construction based on user request example
    // https://app.shadowmap.org/?lat=...&lng=...&zoom=18&basemap=map&time=...
    const url = `https://app.shadowmap.org/?lat=${lat}&lng=${lng}&zoom=18&basemap=map&time=${time}&hud=true`;

    return (
        <div className="w-full h-full bg-gray-100">
            <iframe
                src={url}
                className="w-full h-full border-0"
                title="ShadowMap Simulation"
                allow="geolocation"
                loading="lazy"
            />
        </div>
    );
}
