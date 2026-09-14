'use client';

import React, { useState } from 'react';
import { Crosshair, Plus, Minus, Layers, Maximize2, Minimize2, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export type MapLayerId = 'voyager' | 'dark' | 'osm' | 'satellite';

interface MapLayerOption {
  id: MapLayerId;
  name: string;
  previewColor: string;
  url: string;
  attribution: string;
  subdomains?: string;
}

export const MAP_LAYERS: MapLayerOption[] = [
  {
    id: 'voyager',
    name: 'Voyager (Light)',
    previewColor: '#F4F7F4',
    url: `https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?key=${process.env.NEXT_PUBLIC_CARTO_API_KEY || 'cb1_3kfc_1_768d5315273affdf9aea07d2'}`,
    attribution: '&copy; OpenStreetMap &copy; CARTO',
    subdomains: 'abcd',
  },
  {
    id: 'dark',
    name: 'Dark Matter',
    previewColor: '#1a1a2e',
    url: `https://{s}.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}{r}.png?key=${process.env.NEXT_PUBLIC_CARTO_API_KEY || 'cb1_3kfc_1_768d5315273affdf9aea07d2'}`,
    attribution: '&copy; OpenStreetMap &copy; CARTO',
    subdomains: 'abcd',
  },
  {
    id: 'osm',
    name: 'OpenStreetMap',
    previewColor: '#79b872',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors',
  },
  {
    id: 'satellite',
    name: 'Satellite',
    previewColor: '#1d3557',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
  },
];

interface MapControlsProps {
  currentLayer: MapLayerId;
  onSelectLayer: (layerId: MapLayerId) => void;
  onLocateUser?: () => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  isLocating?: boolean;
}

export default function MapControls({
  currentLayer,
  onSelectLayer,
  onLocateUser,
  onZoomIn,
  onZoomOut,
  isLocating = false,
}: MapControlsProps) {
  const [showLayerMenu, setShowLayerMenu] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
        setIsFullscreen(false);
      }
    }
  };

  return (
    <div className="absolute bottom-6 right-4 z-[1000] flex flex-col gap-2 pointer-events-auto">
      {/* Layer Selector Popup */}
      <AnimatePresence>
        {showLayerMenu && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            className="bg-white/95 backdrop-blur-xl border border-black/10 shadow-2xl rounded-2xl p-3 w-56 space-y-2 mb-1"
          >
            <div className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">
              Basemap Styles
            </div>
            <div className="grid grid-cols-2 gap-2">
              {MAP_LAYERS.map((layer) => {
                const isSelected = currentLayer === layer.id;
                return (
                  <button
                    key={layer.id}
                    onClick={() => {
                      onSelectLayer(layer.id);
                      setShowLayerMenu(false);
                    }}
                    className={`flex flex-col items-center p-2 rounded-xl border text-center transition-all ${
                      isSelected
                        ? 'border-[#2E7D52] bg-[#A8D5BA]/20 font-black text-[#1a1a2e]'
                        : 'border-black/5 bg-[#F8FAFB] hover:bg-black/5 text-gray-600'
                    }`}
                  >
                    <div
                      className="w-full h-8 rounded-lg mb-1 relative flex items-center justify-center shadow-inner"
                      style={{ backgroundColor: layer.previewColor }}
                    >
                      {isSelected && <Check size={14} className="text-white drop-shadow-md" />}
                    </div>
                    <span className="text-[10px] font-bold tracking-tight">{layer.name}</span>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Layer Toggle Button */}
      <button
        onClick={() => setShowLayerMenu(!showLayerMenu)}
        title="Map Layers"
        className={`w-11 h-11 rounded-2xl shadow-lg border flex items-center justify-center transition-all active:scale-95 ${
          showLayerMenu
            ? 'bg-[#2E7D52] text-white border-[#2E7D52]'
            : 'bg-white text-gray-700 border-black/10 hover:bg-[#F0F7F4]'
        }`}
      >
        <Layers size={20} />
      </button>

      {/* Fullscreen Toggle */}
      <button
        onClick={toggleFullscreen}
        title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
        className="w-11 h-11 bg-white text-gray-700 rounded-2xl shadow-lg border border-black/10 flex items-center justify-center hover:bg-[#F0F7F4] active:scale-95 transition-all"
      >
        {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
      </button>

      {/* Current Location GPS Button */}
      {onLocateUser && (
        <button
          onClick={onLocateUser}
          title="Re-center on My Location"
          className={`w-11 h-11 rounded-2xl shadow-xl border flex items-center justify-center active:scale-95 transition-all ${
            isLocating
              ? 'bg-[#2E7D52] text-white border-[#2E7D52] animate-pulse'
              : 'bg-white text-[#2E7D52] border-black/10 hover:bg-[#F0F7F4]'
          }`}
        >
          <Crosshair size={20} />
        </button>
      )}

      {/* Dedicated Zoom Controls (+ / -) */}
      <div className="flex flex-col bg-white rounded-2xl shadow-lg border border-black/10 overflow-hidden">
        {onZoomIn && (
          <button
            onClick={onZoomIn}
            title="Zoom In"
            className="w-11 h-10 flex items-center justify-center text-gray-700 hover:bg-[#F0F7F4] border-b border-black/5 active:scale-95 transition-all"
          >
            <Plus size={18} />
          </button>
        )}
        {onZoomOut && (
          <button
            onClick={onZoomOut}
            title="Zoom Out"
            className="w-11 h-10 flex items-center justify-center text-gray-700 hover:bg-[#F0F7F4] active:scale-95 transition-all"
          >
            <Minus size={18} />
          </button>
        )}
      </div>
    </div>
  );
}
