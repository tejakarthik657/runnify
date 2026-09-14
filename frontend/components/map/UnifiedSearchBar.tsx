'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, MapPin, Navigation, Sparkles, X, Loader2, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { GeocodingResult, searchPlaces } from '../../services/geocoding.service';

export type SearchTab = 'search' | 'directions' | 'ask';

interface UnifiedSearchBarProps {
  activeTab: SearchTab;
  onTabChange: (tab: SearchTab) => void;
  onSelectPlace: (place: GeocodingResult) => void;
  userLat?: number;
  userLng?: number;
  onOpenDirectionsTo?: (place: GeocodingResult) => void;
}

const CATEGORY_CHIPS = [
  { icon: '☕', label: 'Cafes', category: 'cafe' },
  { icon: '🍕', label: 'Restaurants', category: 'restaurant' },
  { icon: '🌳', label: 'Parks', category: 'park' },
  { icon: '🏋️', label: 'Gyms', category: 'gym' },
  { icon: '⛽', label: 'Fuel', category: 'fuel' },
];

export default function UnifiedSearchBar({
  activeTab,
  onTabChange,
  onSelectPlace,
  userLat,
  userLng,
  onOpenDirectionsTo,
}: UnifiedSearchBarProps) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<GeocodingResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const fetchSuggestions = useCallback(async (searchTerm: string) => {
    if (!searchTerm || searchTerm.trim().length < 2) {
      setSuggestions([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const results = await searchPlaces(searchTerm, userLat, userLng);
    setSuggestions(results);
    setIsLoading(false);
  }, [userLat, userLng]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchSuggestions(query);
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, fetchSuggestions]);

  const handleSelect = (place: GeocodingResult) => {
    setQuery(place.name);
    setIsOpen(false);
    onSelectPlace(place);
  };

  return (
    <div className="absolute top-4 left-4 z-[1000] w-[min(420px,calc(100vw-2rem))] pointer-events-auto">
      <div className="bg-white/95 backdrop-blur-xl border border-black/10 shadow-2xl rounded-3xl overflow-hidden">
        {/* Top Mode Tabs */}
        <div className="flex items-center border-b border-black/5 bg-[#F8FAFB] p-1.5 gap-1">
          <button
            onClick={() => onTabChange('search')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-2xl text-[11px] font-black uppercase tracking-wider transition-all ${
              activeTab === 'search'
                ? 'bg-white text-[#1a1a2e] shadow-sm border border-black/5'
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <Search size={14} className={activeTab === 'search' ? 'text-[#2E7D52]' : ''} />
            Search
          </button>

          <button
            onClick={() => onTabChange('directions')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-2xl text-[11px] font-black uppercase tracking-wider transition-all ${
              activeTab === 'directions'
                ? 'bg-white text-[#1a1a2e] shadow-sm border border-black/5'
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <Navigation size={14} className={activeTab === 'directions' ? 'text-[#2E7D52]' : ''} />
            Directions
          </button>

          <button
            onClick={() => onTabChange('ask')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-2xl text-[11px] font-black uppercase tracking-wider transition-all ${
              activeTab === 'ask'
                ? 'bg-gradient-to-r from-[#A594D3] to-[#2E7D52] text-white shadow-md'
                : 'text-[#A594D3] hover:text-[#2E7D52]'
            }`}
          >
            <Sparkles size={14} />
            Ask Map
          </button>
        </div>

        {/* Search Input Bar (when on Search Tab) */}
        {activeTab === 'search' && (
          <div className="p-3">
            <div className="relative flex items-center">
              <Search size={18} className="absolute left-3 text-gray-400 pointer-events-none" />
              <input
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setIsOpen(true);
                }}
                onFocus={() => setIsOpen(true)}
                placeholder="Search addresses, places, POIs..."
                className="w-full pl-10 pr-9 py-2.5 bg-[#F8FAFB] border border-black/10 rounded-2xl text-xs font-bold text-[#1a1a2e] focus:outline-none focus:border-[#2E7D52] focus:bg-white transition-all placeholder:text-gray-400"
              />
              {query && (
                <button
                  onClick={() => {
                    setQuery('');
                    setSuggestions([]);
                  }}
                  className="absolute right-3 text-gray-400 hover:text-gray-600 p-1"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Quick Category Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto pt-2 pb-1 scrollbar-none">
              {CATEGORY_CHIPS.map((chip) => (
                <button
                  key={chip.category}
                  onClick={() => {
                    setQuery(chip.label);
                    fetchSuggestions(chip.label);
                    setIsOpen(true);
                  }}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-[#F0F7F4] border border-black/5 text-[10px] font-bold text-gray-700 hover:bg-[#A8D5BA]/20 hover:border-[#2E7D52]/30 shrink-0 transition-all active:scale-95"
                >
                  <span>{chip.icon}</span>
                  <span>{chip.label}</span>
                </button>
              ))}
            </div>

            {/* Suggestions Dropdown */}
            <AnimatePresence>
              {isOpen && (query.length >= 2 || isLoading) && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="mt-2 border-t border-black/5 pt-2 max-h-64 overflow-y-auto space-y-1"
                >
                  {isLoading && (
                    <div className="flex items-center justify-center gap-2 py-4 text-xs font-bold text-gray-400">
                      <Loader2 size={16} className="animate-spin text-[#2E7D52]" />
                      Geocoding OpenStreetMap...
                    </div>
                  )}

                  {!isLoading && suggestions.length === 0 && (
                    <div className="py-4 text-center text-xs font-medium text-gray-400 italic">
                      No matching locations found nearby.
                    </div>
                  )}

                  {!isLoading &&
                    suggestions.map((item) => (
                      <div
                        key={item.placeId}
                        onClick={() => handleSelect(item)}
                        className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-[#F0F7F4] cursor-pointer group transition-all"
                      >
                        <div className="w-8 h-8 rounded-xl bg-[#A8D5BA]/20 text-[#2E7D52] flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-[#2E7D52] group-hover:text-white transition-all">
                          <MapPin size={16} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-extrabold text-[#1a1a2e] truncate">{item.name}</div>
                          <div className="text-[10px] text-gray-400 font-medium truncate leading-tight">
                            {item.displayName}
                          </div>
                        </div>
                        {onOpenDirectionsTo && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenDirectionsTo(item);
                            }}
                            title="Directions to here"
                            className="p-1.5 text-gray-400 hover:text-[#2E7D52] hover:bg-white rounded-lg transition-all"
                          >
                            <ArrowRight size={14} />
                          </button>
                        )}
                      </div>
                    ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
