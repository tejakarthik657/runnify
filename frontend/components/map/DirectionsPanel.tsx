'use client';

import React, { useState, useEffect } from 'react';
import { X, Car, Footprints, Bike, Navigation, Clock, MapPin, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { calculateRoute, RouteProfile, RouteResponse } from '../../services/routing.service';
import { PlaceDetail } from './PlaceCard';

interface DirectionsPanelProps {
  userLat?: number;
  userLng?: number;
  destination: PlaceDetail | null;
  onClose: () => void;
  onRouteCalculated: (route: RouteResponse | null) => void;
}

export default function DirectionsPanel({
  userLat,
  userLng,
  destination,
  onClose,
  onRouteCalculated,
}: DirectionsPanelProps) {
  const [profile, setProfile] = useState<RouteProfile>('driving');
  const [route, setRoute] = useState<RouteResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showManeuvers, setShowManeuvers] = useState(false);

  useEffect(() => {
    if (!destination || userLat === undefined || userLng === undefined) return;

    let isMounted = true;
    setIsLoading(true);

    calculateRoute(userLat, userLng, destination.lat, destination.lng, profile).then((res) => {
      if (isMounted) {
        setRoute(res);
        setIsLoading(false);
        onRouteCalculated(res);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [userLat, userLng, destination, profile, onRouteCalculated]);

  if (!destination) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="absolute top-4 left-4 z-[1001] w-[min(420px,calc(100vw-2rem))] pointer-events-auto"
    >
      <div className="bg-white/95 backdrop-blur-xl border border-black/10 shadow-2xl rounded-3xl overflow-hidden p-4 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-black/5 pb-2">
          <div className="flex items-center gap-2">
            <Navigation size={18} className="text-[#2E7D52]" />
            <h3 className="text-xs font-black uppercase tracking-wider text-[#1a1a2e]">
              OSRM Directions Engine
            </h3>
          </div>
          <button
            onClick={() => {
              onRouteCalculated(null);
              onClose();
            }}
            className="w-7 h-7 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition-all"
          >
            <X size={14} />
          </button>
        </div>

        {/* Mode Selector */}
        <div className="flex items-center gap-2 bg-[#F8FAFB] p-1 rounded-2xl border border-black/5">
          <button
            onClick={() => setProfile('driving')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all ${
              profile === 'driving' ? 'bg-[#2E7D52] text-white shadow-md' : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            <Car size={15} />
            Drive
          </button>
          <button
            onClick={() => setProfile('walking')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all ${
              profile === 'walking' ? 'bg-[#2E7D52] text-white shadow-md' : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            <Footprints size={15} />
            Walk
          </button>
          <button
            onClick={() => setProfile('cycling')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all ${
              profile === 'cycling' ? 'bg-[#2E7D52] text-white shadow-md' : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            <Bike size={15} />
            Cycle
          </button>
        </div>

        {/* Route Info */}
        <div className="space-y-1.5 bg-[#F0F7F4] p-3 rounded-2xl border border-[#A8D5BA]/30">
          <div className="flex items-center gap-2 text-xs font-bold text-gray-600">
            <span className="w-2.5 h-2.5 rounded-full bg-[#2E7D52]" />
            <span className="text-gray-400 font-semibold">From:</span> My GPS Location
          </div>
          <div className="flex items-center gap-2 text-xs font-bold text-[#1a1a2e]">
            <MapPin size={14} className="text-red-500" />
            <span className="text-gray-400 font-semibold">To:</span> {destination.name}
          </div>
        </div>

        {/* Result Metrics */}
        {isLoading && (
          <div className="flex items-center justify-center gap-2 py-4 text-xs font-bold text-gray-500">
            <Loader2 size={16} className="animate-spin text-[#2E7D52]" />
            Calculating shortest route...
          </div>
        )}

        {!isLoading && route && (
          <div className="space-y-2">
            <div className="flex items-center justify-between bg-[#1a1a2e] text-white p-3 rounded-2xl shadow-md">
              <div>
                <div className="text-lg font-black text-[#A8D5BA]">{route.durationMins} mins</div>
                <div className="text-[10px] text-gray-300 font-bold uppercase tracking-wider">
                  Est. Travel Time
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-extrabold">{route.distanceKm} km</div>
                <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                  Distance
                </div>
              </div>
            </div>

            {/* Turn-by-Turn Steps Toggle */}
            {route.maneuvers.length > 0 && (
              <div>
                <button
                  onClick={() => setShowManeuvers(!showManeuvers)}
                  className="w-full flex items-center justify-between text-xs font-bold text-gray-600 hover:text-[#2E7D52] py-1 px-1"
                >
                  <span>Step-by-Step Directions ({route.maneuvers.length})</span>
                  {showManeuvers ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>

                <AnimatePresence>
                  {showManeuvers && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="max-h-40 overflow-y-auto space-y-1 mt-1 pr-1"
                    >
                      {route.maneuvers.map((m, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-2 bg-gray-50 rounded-xl text-[11px] font-medium text-gray-700 border border-black/5"
                        >
                          <span className="truncate pr-2">{m.instruction}</span>
                          <span className="text-[10px] font-bold text-gray-400 shrink-0">
                            {m.distanceMeters}m
                          </span>
                        </div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
