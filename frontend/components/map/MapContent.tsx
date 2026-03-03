'use client';

import React from 'react';
import { Polyline, Marker, Tooltip } from 'react-leaflet';
import { UserIcon } from '../../lib/mapIcons';
import TerritoryLayer from './TerritoryLayer';

interface MapContentProps {
    isRunning: boolean;
    runPath: [number, number][];
    userColor: string;
    position: { lat: number | null; lng: number | null } | null;
    activeRunners: Record<string, any>;
}

export default function MapContent({
    isRunning,
    runPath,
    userColor,
    position,
    activeRunners
}: MapContentProps) {
    return (
        <>
            <TerritoryLayer />

            {isRunning && runPath.length > 0 && (
                <Polyline
                    positions={runPath}
                    color={userColor}
                    weight={6}
                    opacity={0.8}
                    lineJoin="round"
                />
            )}

            {position && position.lat !== null && position.lng !== null && (
                <Marker
                    position={[position.lat, position.lng]}
                    icon={UserIcon(userColor) as any}
                />
            )}

            {/* Multiplayer Markers */}
            {Object.values(activeRunners).map((runner: any) => (
                <Marker
                    key={runner.userId}
                    position={[runner.lat, runner.lng]}
                    icon={UserIcon(runner.userColor || '#FFD6A5', true) as any}
                >
                    <Tooltip permanent direction="top">
                        <span className="font-black text-[10px] uppercase text-[#1a1a2e] px-2 py-1 bg-white/90 rounded-lg shadow-sm border border-black/5 whitespace-nowrap">
                            {runner.username}
                        </span>
                    </Tooltip>
                </Marker>
            ))}
        </>
    );
}
