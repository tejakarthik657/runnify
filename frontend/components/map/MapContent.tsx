'use client';

import React, { useState } from 'react';
import { Polyline, Marker, Tooltip } from 'react-leaflet';
import { UserIcon } from '../../lib/mapIcons';
import TerritoryLayer from './TerritoryLayer';
import UserLocationMarker from './UserLocationMarker';
import { latLngToCell } from 'h3-js';

interface MapContentProps {
    isRunning: boolean;
    runPath: [number, number][];
    userColor: string;
    position: { lat: number | null; lng: number | null } | null;
    accuracy?: number;
    activeRunners: Record<string, any>;
    stepCount?: number;
    stepRate?: number;
    onCurrentTerritoryChange?: (territory: any) => void;
}

export default function MapContent({
    isRunning,
    runPath,
    userColor,
    position,
    accuracy = 10,
    activeRunners,
    stepCount = 0,
    stepRate = 0,
    onCurrentTerritoryChange,
}: MapContentProps) {
    const [currentTerritory, setCurrentTerritory] = useState<any>(null);

    // Calculate current hex ID from position
    let currentHexId: string | undefined;
    try {
        if (position && position.lat !== null && position.lng !== null) {
            currentHexId = latLngToCell(position.lat, position.lng, 9);
        }
    } catch (err) {
        // Invalid coordinates
    }

    const handleTerritoryChange = (territory: any) => {
        setCurrentTerritory(territory);
        onCurrentTerritoryChange?.(territory);
    };

    return (
        <>
            <TerritoryLayer 
                currentHexId={currentHexId}
                onCurrentTerritoryChange={handleTerritoryChange}
            />

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
                <>
                    <UserLocationMarker 
                        latitude={position.lat}
                        longitude={position.lng}
                        accuracy={accuracy}
                        currentHexId={currentHexId}
                        currentTerritory={currentTerritory}
                        stepCount={stepCount}
                        stepRate={stepRate}
                    />
                    {!isRunning && (
                        <Marker
                            position={[position.lat, position.lng]}
                            icon={UserIcon(userColor) as any}
                        />
                    )}
                </>
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
