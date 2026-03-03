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

const fetcher = (url: string) => api.get(url).then(res => res.data);

export default function TerritoryLayer() {
    const [bounds, setBounds] = useState<any>(null);
    const { data: territories } = useSWR(
        bounds ? `/map/territories?minLat=${bounds.minLat}&minLng=${bounds.minLng}&maxLat=${bounds.maxLat}&maxLng=${bounds.maxLng}` : null,
        fetcher,
        { refreshInterval: 10000 }
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

    useEffect(() => {
        const b = map.getBounds();
        setBounds({
            minLat: b.getSouth(),
            minLng: b.getWest(),
            maxLat: b.getNorth(),
            maxLng: b.getEast(),
        });
    }, [map]);

    if (!territories?.territories) return null;

    return (
        <>
            {territories.territories.map((territory: any) => {
                const boundary = cellToBoundary(territory.hexId);
                const positions: [number, number][] = boundary.map(coord => [coord[0], coord[1]]);

                // Determine color based on owner (simplified logic for now)
                const isOwnedByMe = territory.owner?._id === territories.myUserId; // Assuming backend provides this
                const rawColor = territory.owner?.color || COLORS.rose;
                const hexColor = isOwnedByMe ? COLORS.sage : rawColor;

                return (
                    <Polygon
                        key={territory.hexId}
                        positions={positions}
                        pathOptions={{
                            color: '#1a1a2e', // Dark contrast border
                            fillColor: hexColor,
                            fillOpacity: 0.35,
                            weight: 1.5,
                            lineJoin: 'round',
                            opacity: 0.4, // Border opacity
                        }}
                        eventHandlers={{
                            mouseover: (e) => {
                                const layer = e.target;
                                layer.setStyle({
                                    fillOpacity: 0.6,
                                    weight: 4,
                                });
                            },
                            mouseout: (e) => {
                                const layer = e.target;
                                layer.setStyle({
                                    fillOpacity: 0.3,
                                    weight: 2,
                                });
                            },
                        }}
                    >
                        <Tooltip sticky direction="top" className="pastel-tooltip">
                            <div className="bg-white rounded-2xl p-4 shadow-xl border border-black/5 min-w-[140px]">
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: hexColor }} />
                                    <span className="text-[11px] font-black uppercase tracking-tight text-[#1a1a2e]">
                                        {territory.owner?.username || 'Wild Territory'}
                                    </span>
                                </div>
                                <div className="space-y-1">
                                    <div className="flex justify-between text-[10px] font-bold text-gray-400">
                                        <span>YIELD</span>
                                        <span className="text-[#2E7D52]">{territory.creditsValue} TRC</span>
                                    </div>
                                    <div className="flex justify-between text-[10px] font-bold text-gray-400">
                                        <span>ID</span>
                                        <span className="text-[#1a1a2e]">{territory.hexId.slice(-6).toUpperCase()}</span>
                                    </div>
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
