// components/map/UserLocationMarker.tsx
// Displays current user location on map with accuracy circle + territory info

import React, { useMemo } from 'react';
import { Circle, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { Crosshair, Clock, User } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

interface UserLocationMarkerProps {
  latitude: number;
  longitude: number;
  accuracy?: number;
  currentHexId?: string;
  currentTerritory?: {
    hexId: string;
    ownerId: string;
    ownerUsername: string;
    ownerColor: string;
    creditValue: number;
    claimedAt: string;
    expiresAt: string;
  };
  stepCount?: number;
  stepRate?: number;
}

const TERRITORY_COLORS: Record<string, string> = {
  red: '#ef4444',
  blue: '#3b82f6',
  green: '#10b981',
  yellow: '#eab308',
  purple: '#a855f7',
  pink: '#ec4899',
  cyan: '#06b6d4',
  orange: '#f97316',
};

export default function UserLocationMarker({
  latitude,
  longitude,
  accuracy = 10,
  currentHexId,
  currentTerritory,
  stepCount = 0,
  stepRate = 0,
}: UserLocationMarkerProps) {
  const { user } = useAuthStore();

  // User position marker with pulsing effect
  const userIcon = useMemo(() => {
    const html = `
      <div style="
        width: 24px;
        height: 24px;
        border-radius: 50%;
        background: linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%);
        border: 3px solid white;
        box-shadow: 0 0 12px rgba(59, 130, 246, 0.6);
        display: flex;
        align-items: center;
        justify-content: center;
        animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
      ">
        <div style="
          width: 6px;
          height: 6px;
          background: white;
          border-radius: 50%;
        "></div>
      </div>
      <style>
        @keyframes pulse {
          0%, 100% { box-shadow: 0 0 12px rgba(59, 130, 246, 0.6); }
          50% { box-shadow: 0 0 24px rgba(59, 130, 246, 0.9); }
        }
      </style>
    `;
    return L.divIcon({
      html,
      iconSize: [24, 24],
      className: 'user-location-marker',
    });
  }, []);

  const hoursLeft = useMemo(() => {
    if (!currentTerritory?.expiresAt) return 0;
    const now = Date.now();
    const expiry = new Date(currentTerritory.expiresAt).getTime();
    const msLeft = Math.max(0, expiry - now);
    return Math.ceil(msLeft / (1000 * 60 * 60));
  }, [currentTerritory?.expiresAt]);

  const isOwnTerritory = currentTerritory?.ownerId === user?.id;
  const territoryColor = currentTerritory?.ownerColor 
    ? TERRITORY_COLORS[currentTerritory.ownerColor] || '#6b7280'
    : '#d1d5db';

  return (
    <>
      {/* Accuracy circle */}
      <Circle
        center={[latitude, longitude]}
        radius={Math.max(5, accuracy || 10)}
        pathOptions={{
          color: '#3b82f6',
          weight: 1,
          opacity: 0.3,
          fill: true,
          fillColor: '#3b82f6',
          fillOpacity: 0.08,
          dashArray: '5, 5',
        }}
      />

      {/* User position marker */}
      <Marker
        position={[latitude, longitude]}
        icon={userIcon}
        title={`You (±${accuracy?.toFixed(0) || 10}m)`}
      >
        <Popup className="user-location-popup">
          <div className="p-3 bg-white rounded-lg shadow-lg border border-blue-200">
            {/* User Info */}
            <div className="flex items-center gap-2 mb-2">
              <Crosshair size={14} className="text-blue-600" />
              <span className="font-semibold text-sm text-gray-900">{user?.username || 'Runner'}</span>
            </div>

            {/* Coordinates */}
            <div className="text-xs text-gray-600 font-mono mb-2">
              <div className="bg-gray-50 px-2 py-1 rounded border border-gray-200">
                {latitude.toFixed(5)}, {longitude.toFixed(5)}
              </div>
            </div>

            {/* Steps & Cadence */}
            <div className="bg-blue-50 border border-blue-200 rounded px-2 py-1 mb-2">
              <div className="text-xs text-blue-900 font-mono">
                <div className="font-bold">{stepCount.toLocaleString()} steps</div>
                <div className="text-blue-700">{stepRate} steps/min</div>
              </div>
            </div>

            {/* Territory Info */}
            {currentTerritory && (
              <div 
                className="rounded p-2 mb-2 border-l-4"
                style={{
                  backgroundColor: `${territoryColor}15`,
                  borderLeftColor: territoryColor,
                }}
              >
                <div className="text-xs font-bold text-gray-900 mb-1">
                  Territory: {currentHexId?.slice(-6) || 'Unknown'}
                </div>
                <div className="text-xs text-gray-700 space-y-0.5">
                  <div className="flex items-center gap-1">
                    <User size={10} />
                    <span>
                      {isOwnTerritory ? '🏠 Your territory' : `Owner: ${currentTerritory.ownerUsername}`}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Crosshair size={10} />
                    <span>Yield: {currentTerritory.creditValue} TRC</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock size={10} />
                    <span>
                      Expires in {hoursLeft}h
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Accuracy Badge */}
            <div className="text-xs text-gray-500 border-t pt-1">
              Accuracy: ±{accuracy?.toFixed(0) || 10}m
            </div>
          </div>
        </Popup>
      </Marker>
    </>
  );
}
