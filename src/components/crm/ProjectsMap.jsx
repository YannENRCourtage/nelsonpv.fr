import React, { useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Button } from '@/components/ui/button';
import { ExternalLink, MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// Custom icons
const createIcon = (color) => new L.Icon({
    iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

const blueIcon = createIcon('blue');
const redIcon = createIcon('red');
const greenIcon = createIcon('green');
const orangeIcon = createIcon('orange');
const goldIcon = createIcon('gold');
const violetIcon = createIcon('violet');
const greyIcon = createIcon('grey');

function MapBounds({ bounds }) {
    const map = useMap();
    useMemo(() => {
        if (bounds && bounds.length > 0) {
            map.fitBounds(bounds, { padding: [50, 50] });
        }
    }, [bounds, map]);
    return null;
}

export default function ProjectsMap({ projects }) {
    const navigate = useNavigate();

    const { markers, bounds } = useMemo(() => {
        const validMarkers = [];
        const latLngs = [];

        projects.forEach(p => {
            // Prioritize GPS field if available
            let lat = null;
            let lng = null;

            if (p.gps) {
                const parts = p.gps.split(',').map(s => parseFloat(s.trim()));
                if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
                    lat = parts[0];
                    lng = parts[1];
                }
            }

            // If no GPS but valid lat/lng properties (fallback)
            if (lat === null && p.lat && p.lng) {
                lat = parseFloat(p.lat);
                lng = parseFloat(p.lng);
            }

            if (lat !== null && lng !== null) {
                // Determine icon color based on TYPE
                let icon = greyIcon;
                const type = (p.type || '').toLowerCase();

                if (type.includes('construction') && type.includes('rénovation')) {
                    icon = orangeIcon;
                } else if (type.includes('construction')) {
                    icon = blueIcon;
                } else if (type.includes('rénovation') || type.includes('renovation')) {
                    icon = greenIcon;
                } else if (type.includes('location')) {
                    icon = violetIcon;
                } else {
                    icon = greyIcon;
                }

                validMarkers.push({ ...p, lat, lng, icon });
                latLngs.push([lat, lng]);
            }
        });

        // Calculate bounds
        let calculatedBounds = null;
        if (latLngs.length > 0) {
            calculatedBounds = L.latLngBounds(latLngs);
        }

        return { markers: validMarkers, bounds: calculatedBounds };
    }, [projects]);

    // Default center (France)
    const defaultCenter = [46.603354, 1.888334];
    const defaultZoom = 6;

    return (
        <div className="h-[600px] w-full rounded-2xl overflow-hidden shadow-sm border border-slate-200 z-0 relative">
            {/* Force z-index 0 to avoid overlapping modals if any */}
            <MapContainer
                center={defaultCenter}
                zoom={defaultZoom}
                style={{ height: '100%', width: '100%' }}
                scrollWheelZoom={true}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {bounds && <MapBounds bounds={bounds} />}

                {markers.map(project => (
                    <Marker
                        key={project.id}
                        position={[project.lat, project.lng]}
                        icon={project.icon}
                    >
                        <Popup>
                            <div className="min-w-[200px]">
                                <h3 className="font-bold text-slate-900 text-lg mb-1">{project.name}</h3>
                                <div className="text-sm text-slate-600 mb-2 space-y-1">
                                    <p className="flex items-center gap-1"><MapPin size={14} /> {project.city} ({project.zip})</p>
                                    <p>Client: <span className="font-semibold">{project.clientName || `${project.firstName || ''} ${project.lastName || ''}`.trim() || 'N/A'}</span></p>
                                    <p>Type: <span className="font-semibold" style={{ color: project.icon.options.iconUrl.includes('blue') ? '#2563eb' : project.icon.options.iconUrl.includes('green') ? '#16a34a' : project.icon.options.iconUrl.includes('orange') ? '#f97316' : '#6b7280' }}>{project.type}</span></p>
                                    <p>Statut: <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${project.status === 'Terminé' ? 'bg-green-100 text-green-700' :
                                            project.status === 'En cours' ? 'bg-orange-100 text-orange-700' :
                                                'bg-blue-100 text-blue-700'
                                        }`}>{project.status}</span></p>
                                </div>

                                <div className="pt-2 border-t border-slate-100 mt-2">
                                    <Button
                                        size="sm"
                                        onClick={() => navigate(`/project/${project.id}/edit`)}
                                        className="w-full bg-blue-600 hover:bg-blue-700"
                                    >
                                        Ouvrir le projet <ExternalLink size={14} className="ml-2" />
                                    </Button>
                                </div>
                            </div>
                        </Popup>
                    </Marker>
                ))}
            </MapContainer>
        </div>
    );
}
