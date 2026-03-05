'use client';

import React, { useEffect, useState } from 'react';
import { Polyline, Tooltip, useMapEvent } from 'react-leaflet';
import useSWR from 'swr';
import api from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { toast } from 'react-hot-toast';

const fetcher = (url: string) => api.get(url).then(res => res.data);

interface PathTrace {
    runId: string;
    userId: string;
    username: string;
    userColor: string;
    endedAt: string;
    distanceKm: number;
    hexesTotal: number;
    creditsEarned: number;
    path: Array<{ lat: number; lng: number; recordedAt: string }>;
}

interface PathTraceLayerProps {
    /** Callback when territory notifications should be shown */
    onTerritoryNotification?: (territory: { username: string; location: string; credits: number }) => void;
}

export default function PathTraceLayer({ onTerritoryNotification }: PathTraceLayerProps) {
    const [bounds, setBounds] = useState<any>(null);
    const { user } = useAuthStore();
    const [notifiedTraces, setNotifiedTraces] = useState<Set<string>>(new Set());
    
    const { data: tracesData } = useSWR(
        bounds ? `/map/path-traces?minLat=${bounds.minLat}&minLng=${bounds.minLng}&maxLat=${bounds.maxLat}&maxLng=${bounds.maxLng}` : null,
        fetcher,
        { refreshInterval: 15000 } // Refresh every 15 seconds
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

    // Show territory claim notifications for new traces
    useEffect(() => {
        if (!tracesData?.traces || !onTerritoryNotification) return;
        
        tracesData.traces.forEach((trace: PathTrace) => {
            const traceId = trace.runId;
            // Only notify for other users' recent traces (within last 5 minutes)
            if (trace.userId !== user?.id && !notifiedTraces.has(traceId)) {
                const endedAt = new Date(trace.endedAt).getTime();
                const now = Date.now();
                const ageMinutes = (now - endedAt) / (60 * 1000);
                
                if (ageMinutes <= 5 && trace.hexesTotal > 0) {
                    // Extract approximate location from first path point
                    const firstPoint = trace.path[0];
                    const location = firstPoint ? `${firstPoint.lat.toFixed(4)}, ${firstPoint.lng.toFixed(4)}` : 'Unknown';
                    
                    toast.success(
                        `🗺️ ${trace.username} claimed ${trace.hexesTotal} territories nearby! (+${trace.creditsEarned} TRC)`,
                        { duration: 5000 }
                    );
                    
                    setNotifiedTraces(prev => {
                        const newSet = new Set(Array.from(prev));
                        newSet.add(traceId);
                        return newSet;
                    });
                }
            }
        });
    }, [tracesData?.traces, user?.id, onTerritoryNotification, notifiedTraces]);

    if (!tracesData?.traces || tracesData.traces.length === 0) return null;

    return (
        <>
            {tracesData.traces.map((trace: PathTrace) => {
                if (!trace.path || trace.path.length < 2) return null;

                const positions: [number, number][] = trace.path.map(point => [point.lat, point.lng]);
                const isOwnTrace = trace.userId === user?.id;
                const endedAt = new Date(trace.endedAt);
                const hoursAgo = Math.round((Date.now() - endedAt.getTime()) / (1000 * 60 * 60));
                
                // Calculate opacity based on age (fade over 24 hours)
                const ageRatio = Math.min(1, hoursAgo / 24);
                const opacity = Math.max(0.2, 0.8 - (ageRatio * 0.6));
                const weight = isOwnTrace ? 5 : 3;
                
                return (
                    <Polyline
                        key={trace.runId}
                        positions={positions}
                        pathOptions={{
                            color: trace.userColor,
                            weight: weight,
                            opacity: opacity,
                            lineJoin: 'round',
                            lineCap: 'round',
                            dashArray: isOwnTrace ? '10, 5' : undefined,
                        }}
                        eventHandlers={{
                            mouseover: (e) => {
                                const layer = e.target;
                                layer.setStyle({
                                    weight: weight + 2,
                                    opacity: Math.min(1, opacity + 0.2),
                                });
                            },
                            mouseout: (e) => {
                                const layer = e.target;
                                layer.setStyle({
                                    weight: weight,
                                    opacity: opacity,
                                });
                            },
                        }}
                    >
                        <Tooltip sticky direction="top" className="path-tooltip">
                            <div className={`rounded-2xl p-4 shadow-xl border min-w-[160px] ${
                                isOwnTrace 
                                    ? 'bg-blue-50 border-blue-300' 
                                    : 'bg-white border-black/5'
                            }`}>
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: trace.userColor }} />
                                    <span className="text-[11px] font-black uppercase tracking-tight text-[#1a1a2e]">
                                        {isOwnTrace ? '🏃 ' : ''}{trace.username}
                                    </span>
                                </div>
                                <div className="space-y-1">
                                    <div className="flex justify-between text-[10px] font-bold text-gray-400">
                                        <span>DISTANCE</span>
                                        <span className="text-[#2E7D52]">{trace.distanceKm.toFixed(2)} km</span>
                                    </div>
                                    <div className="flex justify-between text-[10px] font-bold text-gray-400">
                                        <span>TERRITORIES</span>
                                        <span className="text-[#2E7D52]">{trace.hexesTotal}</span>
                                    </div>
                                    <div className="flex justify-between text-[10px] font-bold text-gray-400">
                                        <span>EARNED</span>
                                        <span className="text-[#A594D3]">{trace.creditsEarned} TRC</span>
                                    </div>
                                    <div className="flex justify-between text-[10px] font-bold text-gray-400">
                                        <span>AGE</span>
                                        <span className="text-[#E89BA5]">{hoursAgo}H ago</span>
                                    </div>
                                    {isOwnTrace && (
                                        <div className="mt-2 pt-2 border-t border-blue-200 text-[10px] font-bold text-blue-600">
                                            Your trail
                                        </div>
                                    )}
                                </div>
                            </div>
                        </Tooltip>
                    </Polyline>
                );
            })}

            <style jsx global>{`
                .path-tooltip {
                    background: transparent !important;
                    border: none !important;
                    box-shadow: none !important;
                    padding: 0 !important;
                }
                .path-tooltip:before {
                    display: none !important;
                }
            `}</style>
        </>
    );
}
