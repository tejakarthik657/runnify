'use client';

import React, { useEffect, useState } from 'react';
import { Polygon, Tooltip, useMapEvent } from 'react-leaflet';
import useSWR from 'swr';
import api from '../../services/api';
import { cellToBoundary } from 'h3-js';

// Design Tokens from Documentation
const COLORS = {
    sage: '#A8D5BA',
    rose: '#F4B8C1',
    peach: '#FFD6A5',
    text: '#1a1a2e',
};

// Faction colors
const FACTION_COLORS = {
    red: '#FF4444',
    blue: '#4488FF',
    green: '#44FF88',
};

const fetcher = (url: string) => api.get(url).then(res => res.data);

interface TerritoryLayerProps {
    currentHexId?: string;
    onCurrentTerritoryChange?: (territory: any) => void;
}

export default function TerritoryLayer({ currentHexId, onCurrentTerritoryChange }: TerritoryLayerProps) {
    const [bounds, setBounds] = useState<any>(null);
    const [zoom, setZoom] = useState(16);
    
    // Determine if we should show faction view or individual territories
    const showFactionView = zoom < 14;
    const factionResolution = zoom < 10 ? 4 : 6; // City-level vs neighborhood-level
    
    // Fetch individual territories (zoomed in)
    const { data: territories } = useSWR(
        bounds && !showFactionView ? `/map/territories?minLat=${bounds.minLat}&minLng=${bounds.minLng}&maxLat=${bounds.maxLat}&maxLng=${bounds.maxLng}` : null,
        fetcher,
        { refreshInterval: 10000 }
    );
    
    // Fetch faction data (zoomed out)
    const { data: factionData } = useSWR(
        showFactionView ? `/map/factions?resolution=${factionResolution}` : null,
        fetcher,
        { refreshInterval: 30000 }
    );

    const map = useMapEvent('moveend', (event) => {
        const b = event.target.getBounds();
        setBounds({
            minLat: b.getSouth(),
            minLng: b.getWest(),
            maxLat: b.getNorth(),
            maxLng: b.getEast(),
        });
    });
    
    const mapZoom = useMapEvent('zoomend', (event) => {
        setZoom(event.target.getZoom());
    });

    useEffect(() => {
        const b = map.getBounds();
        setBounds({
            minLat: b.getSouth(),
            minLng: b.getWest(),
            maxLat: b.getNorth(),
            maxLng: b.getEast(),
        });
        setZoom(map.getZoom());
    }, [map]);

    // Notify parent when current territory changes
    useEffect(() => {
        if (!currentHexId || !territories?.features) return;
        const current = territories.features.find((t: any) => t.hexId === currentHexId);
        onCurrentTerritoryChange?.(current || null);
    }, [currentHexId, territories?.features, onCurrentTerritoryChange]);

    // Render faction view (zoomed out)
    if (showFactionView && factionData?.hexes) {
        return (
            <>
                {factionData.hexes.map((hex: any) => {
                    try {
                        const boundary = cellToBoundary(hex.hexId);
                        const positions: [number, number][] = boundary.map(coord => [coord[0], coord[1]]);
                        
                        // Determine dominant faction
                        const factionCounts = {
                            red: hex.redCount || 0,
                            blue: hex.blueCount || 0,
                            green: hex.greenCount || 0,
                        };
                        const dominantFaction = Object.entries(factionCounts).reduce((a, b) => 
                            factionCounts[a[0] as keyof typeof factionCounts] > factionCounts[b[0] as keyof typeof factionCounts] ? a : b
                        )[0] as 'red' | 'blue' | 'green';
                        
                        const totalCount = hex.total || 1;
                        const dominance = (factionCounts[dominantFaction] / totalCount);
                        const fillOpacity = Math.max(0.2, Math.min(0.7, dominance));

                        return (
                            <Polygon
                                key={hex.hexId}
                                positions={positions}
                                pathOptions={{
                                    color: FACTION_COLORS[dominantFaction],
                                    fillColor: FACTION_COLORS[dominantFaction],
                                    fillOpacity,
                                    weight: 2,
                                    lineJoin: 'round',
                                    opacity: 0.6,
                                }}
                            >
                                <Tooltip sticky direction="top" className="pastel-tooltip">
                                    <div className="rounded-2xl p-4 shadow-xl border bg-white border-black/5 min-w-[180px]">
                                        <div className="flex items-center gap-2 mb-3">
                                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: FACTION_COLORS[dominantFaction] }} />
                                            <span className="text-[11px] font-black uppercase tracking-tight text-[#1a1a2e]">
                                                {dominantFaction === 'red' ? '🔴 Red Legion' : dominantFaction === 'blue' ? '🔵 Blue Syndicate' : '🟢 Green Nomads'}
                                            </span>
                                        </div>
                                        <div className="space-y-2">
                                            <div className="flex justify-between text-[10px] font-bold text-gray-400">
                                                <span>CONTROL</span>
                                                <span className="text-[#2E7D52]">{(dominance * 100).toFixed(1)}%</span>
                                            </div>
                                            <div className="space-y-1 pt-2 border-t border-black/5">
                                                <div className="flex justify-between text-[9px] font-bold">
                                                    <span className="text-red-600">🔴 Red</span>
                                                    <span>{hex.redCount || 0}</span>
                                                </div>
                                                <div className="flex justify-between text-[9px] font-bold">
                                                    <span className="text-blue-600">🔵 Blue</span>
                                                    <span>{hex.blueCount || 0}</span>
                                                </div>
                                                <div className="flex justify-between text-[9px] font-bold">
                                                    <span className="text-green-600">🟢 Green</span>
                                                    <span>{hex.greenCount || 0}</span>
                                                </div>
                                            </div>
                                            <div className="mt-2 pt-2 border-t border-black/5 text-[9px] font-bold text-gray-400">
                                                Zoom in to see individual territories
                                            </div>
                                        </div>
                                    </div>
                                </Tooltip>
                            </Polygon>
                        );
                    } catch (err) {
                        console.error('Invalid hex boundary:', hex.hexId);
                        return null;
                    }
                })}
                <style jsx global>{`
                    .pastel-tooltip {
                        background: transparent !important;
                        border: none !important;
                        box-shadow: none !important;
                        padding: 0 !important;
                    }
                    .pastel-tooltip:before {
                        display: none !important;
                    }
                `}</style>
            </>
        );
    }

    // Render individual territories (zoomed in)
    if (!territories?.features) return null;

    return (
        <>
            {territories.features.map((territory: any) => {
                const boundary = cellToBoundary(territory.hexId);
                const positions: [number, number][] = boundary.map(coord => [coord[0], coord[1]]);

                // Determine color based on owner
                const isCurrentTerritory = territory.hexId === currentHexId;
                const rawColor = territory.ownerColor || COLORS.rose;
                const hexColor = rawColor;
                const claimedAtMs = territory?.claimedAt ? new Date(territory.claimedAt).getTime() : Date.now();
                const ageRatio = Math.min(1, Math.max(0, (Date.now() - claimedAtMs) / (24 * 60 * 60 * 1000)));
                const freshness = 1 - ageRatio;
                const fillOpacity = Math.max(0.08, 0.15 + (0.35 * freshness));
                const hoursLeft = Math.max(0, Math.ceil(24 * freshness));

                return (
                    <Polygon
                        key={territory.hexId}
                        positions={positions}
                        pathOptions={{
                            color: isCurrentTerritory ? '#2563eb' : '#1a1a2e', // Blue for current, dark contrast border
                            fillColor: hexColor,
                            fillOpacity: isCurrentTerritory ? Math.min(0.8, fillOpacity + 0.3) : fillOpacity,
                            weight: isCurrentTerritory ? 3 : 1.5,
                            lineJoin: 'round',
                            opacity: isCurrentTerritory ? 0.8 : 0.4, // Brighter border for current
                            dashArray: isCurrentTerritory ? '8, 4' : undefined, // Dashed border for current
                        }}
                        eventHandlers={{
                            mouseover: (e) => {
                                const layer = e.target;
                                if (!isCurrentTerritory) {
                                    layer.setStyle({
                                        fillOpacity: 0.6,
                                        weight: 4,
                                    });
                                }
                            },
                            mouseout: (e) => {
                                const layer = e.target;
                                if (!isCurrentTerritory) {
                                    layer.setStyle({
                                        fillOpacity: 0.3,
                                        weight: 2,
                                    });
                                }
                            },
                        }}
                    >
                        <Tooltip sticky direction="top" className="pastel-tooltip">
                            <div className={`rounded-2xl p-4 shadow-xl border min-w-[140px] ${
                                isCurrentTerritory 
                                    ? 'bg-blue-50 border-blue-300' 
                                    : 'bg-white border-black/5'
                            }`}>
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: hexColor }} />
                                    <span className="text-[11px] font-black uppercase tracking-tight text-[#1a1a2e]">
                                        {isCurrentTerritory ? '📍 ' : ''}{territory.ownerUsername || 'Wild Territory'}
                                    </span>
                                </div>
                                <div className="space-y-1">
                                    <div className="flex justify-between text-[10px] font-bold text-gray-400">
                                        <span>YIELD</span>
                                        <span className="text-[#2E7D52]">{territory.creditValue} TRC</span>
                                    </div>
                                    <div className="flex justify-between text-[10px] font-bold text-gray-400">
                                        <span>EXPIRES</span>
                                        <span className="text-[#E89BA5]">{hoursLeft}H</span>
                                    </div>
                                    <div className="flex justify-between text-[10px] font-bold text-gray-400">
                                        <span>ID</span>
                                        <span className="text-[#1a1a2e]">{territory.hexId.slice(-6).toUpperCase()}</span>
                                    </div>
                                    {isCurrentTerritory && (
                                        <div className="mt-2 pt-2 border-t border-blue-200 text-[10px] font-bold text-blue-600">
                                            You are here
                                        </div>
                                    )}
                                </div>
                            </div>
                        </Tooltip>
                    </Polygon>
                );
            })}

            <style jsx global>{`
                .pastel-tooltip {
                    background: transparent !important;
                    border: none !important;
                    box-shadow: none !important;
                    padding: 0 !important;
                }
                .pastel-tooltip:before {
                    display: none !important;
                }
            `}</style>
        </>
    );
}
