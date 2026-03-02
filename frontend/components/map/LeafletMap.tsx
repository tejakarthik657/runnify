'use client';

import React, { useEffect } from 'react';
import { MapContainer, TileLayer, useMap, ZoomControl } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// 4. Component Library: Pastel Marker Styling
const DefaultIcon = L.divIcon({
    className: 'pastel-marker',
    html: `<div style="width: 14px; height: 14px; background: #A8D5BA; border: 3px solid white; border-radius: 50%; box-shadow: 0 4px 12px rgba(0,0,0,0.15);"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
});
L.Marker.prototype.options.icon = DefaultIcon;

interface LeafletMapProps {
    center: [number, number];
    zoom: number;
    children?: React.ReactNode;
}

// 6.0 Motion Rule: Smooth view transitions
function ChangeView({ center, zoom }: { center: [number, number], zoom: number }) {
    const map = useMap();
    useEffect(() => {
        map.flyTo(center, zoom, {
            duration: 1.5,
            easeLinearity: 0.25
        });
    }, [center, zoom, map]);
    return null;
}

export default function LeafletMap({ center, zoom, children }: LeafletMapProps) {
    return (
        <div className="h-full w-full bg-[#F4F7F4] relative group">
            {/* Soft Grid Overlay Layer */}
            <div className="absolute inset-0 z-[400] pointer-events-none opacity-[0.03]"
                style={{ backgroundImage: `radial-gradient(#1a1a2e 1px, transparent 1px)`, backgroundSize: '40px 40px' }} />

            <div className="h-full w-full relative">
                <MapContainer
                    center={center}
                    zoom={zoom}
                    zoomControl={false}
                    attributionControl={false}
                    className="h-full w-full bg-[#F4F7F4]"
                    maxZoom={20}
                >
                    {/* Light-themed Base Layer: Carto Voyager */}
                    <TileLayer
                        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                        opacity={1}
                        maxZoom={20}
                        maxNativeZoom={18}
                    />

                    <ChangeView center={center} zoom={zoom} />

                    {/* Friendly Zoom Control Styling */}
                    <ZoomControl position="bottomright" />

                    {children}
                </MapContainer>
            </div>

            {/* CSS Overrides for Pastel Readability */}
            <style jsx global>{`
                .leaflet-container {
                    background: #F4F7F4 !important;
                    font-family: 'Nunito', sans-serif !important;
                }
                .leaflet-bar {
                    border: 1px solid rgba(0, 0, 0, 0.05) !important;
                    border-radius: 16px !important;
                    box-shadow: 0 8px 24px rgba(0,0,0,0.08) !important;
                    overflow: hidden;
                    margin-right: 20px !important;
                    margin-bottom: 20px !important;
                }
                .leaflet-bar a {
                    background-color: white !important;
                    color: #1a1a2e !important;
                    border-bottom: 1px solid rgba(0, 0, 0, 0.05) !important;
                    transition: all 0.2s ease;
                    width: 44px !important;
                    height: 44px !important;
                    line-height: 44px !important;
                }
                .leaflet-bar a:hover {
                    background-color: #F0F7F4 !important;
                    color: #2E7D52 !important;
                }
                .leaflet-control-zoom-in, .leaflet-control-zoom-out {
                    font-size: 18px !important;
                    font-weight: 800 !important;
                }
                .leaflet-control-attribution {
                    display: none !important;
                }
            `}</style>
        </div>
    );
}
