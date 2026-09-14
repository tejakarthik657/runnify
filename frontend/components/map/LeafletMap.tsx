'use client';

import React, { useEffect } from 'react';
import { MapContainer, TileLayer, useMap, ZoomControl, Polyline, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Default Icon Fix for Leaflet
const DefaultIcon = L.divIcon({
    className: 'pastel-marker',
    html: `<div style="width: 14px; height: 14px; background: #A8D5BA; border: 3px solid white; border-radius: 50%; box-shadow: 0 4px 12px rgba(0,0,0,0.15);"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
});
L.Marker.prototype.options.icon = DefaultIcon;

import { MAP_LAYERS, MapLayerId } from './MapControls';

interface LeafletMapProps {
    center: [number, number];
    zoom: number;
    children?: React.ReactNode;
    onMapReady?: (map: L.Map | null) => void;
    followUser?: boolean;
    onManualMove?: () => void;
    activeLayer?: MapLayerId;
}

// 6.0 Motion Rule: Smooth view transitions
function ChangeView({ center, zoom, enabled }: { center: [number, number], zoom: number, enabled: boolean }) {
    const map = useMap();
    useEffect(() => {
        if (!enabled) return;
        map.flyTo(center, zoom, {
            duration: 0.5,
            easeLinearity: 0.25
        });
    }, [center, zoom, map, enabled]);
    return null;
}

import { useMapEvents } from 'react-leaflet';

function MapEventsHandler({ onManualMove }: { onManualMove?: () => void }) {
    useMapEvents({
        dragstart: () => {
            if (onManualMove) onManualMove();
        },
        zoomstart: () => {
            if (onManualMove) onManualMove();
        }
    });
    return null;
}

function MapInstanceHandler({ onReady }: { onReady?: (map: L.Map | null) => void }) {
    const map = useMap();
    useEffect(() => {
        if (onReady) {
            onReady(map);
            return () => {
                onReady(null);
            };
        }
    }, [map, onReady]);
    return null;
}

export default function LeafletMap({ center, zoom, children, onMapReady, followUser, onManualMove, activeLayer = 'voyager' }: LeafletMapProps) {
    const selectedLayer = MAP_LAYERS.find(l => l.id === activeLayer) || MAP_LAYERS[0];

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
                    {/* Dynamic Base Layer Tile Setup */}
                    <TileLayer
                        key={selectedLayer.id}
                        url={selectedLayer.url}
                        attribution={selectedLayer.attribution}
                        subdomains={selectedLayer.subdomains}
                        opacity={1}
                        maxZoom={20}
                        maxNativeZoom={18}
                    />

                    <ChangeView center={center} zoom={zoom} enabled={!!followUser} />
                    <MapInstanceHandler onReady={onMapReady} />
                    <MapEventsHandler onManualMove={onManualMove} />

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
                @keyframes pulse-gps {
                    0% { transform: scale(1); opacity: 1; }
                    100% { transform: scale(2.5); opacity: 0; }
                }
                @keyframes pulse-gps-other {
                    0% { transform: scale(1); opacity: 0.8; }
                    50% { transform: scale(1.8); opacity: 0.4; }
                    100% { transform: scale(1); opacity: 0.8; }
                }
            `}</style>
        </div>
    );
}
