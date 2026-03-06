'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Zap } from 'lucide-react';
import api from '../services/api';

interface FactionPickerProps {
  onFactionSelected: (faction: 'red' | 'blue' | 'green') => void;
  isOpen: boolean;
}

const FACTIONS = [
  {
    id: 'red' as const,
    name: 'Red Legion',
    color: '#FF4444',
    description: 'Conquer with fire and aggression. Dominate through strength.',
    icon: '🔴',
    tagline: 'Strength Through Fire',
  },
  {
    id: 'blue' as const,
    name: 'Blue Syndicate',
    color: '#4488FF',
    description: 'Control through strategy and precision. Outsmart your opponents.',
    icon: '🔵',
    tagline: 'Strategy Over Strength',
  },
  {
    id: 'green' as const,
    name: 'Green Nomads',
    color: '#44FF88',
    description: 'Freedom through movement. Explore and liberate the world.',
    icon: '🟢',
    tagline: 'Freedom Through Movement',
  },
];

export default function FactionPicker({
  onFactionSelected,
  isOpen,
}: FactionPickerProps) {
  const [selected, setSelected] = useState<'red' | 'blue' | 'green' | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSelectFaction = async (factionId: 'red' | 'blue' | 'green') => {
    setSelected(factionId);
    setIsLoading(true);
    setError(null);

    try {
      console.log('[FactionPicker] Sending faction request:', { faction: factionId });
      const response = await api.patch('/user/me/faction', { faction: factionId });
      console.log('[FactionPicker] Faction response:', response.data);
      if (response.status === 200) {
        onFactionSelected(factionId);
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || err.message || 'Failed to select faction';
      console.error('[FactionPicker] Error selecting faction:', errorMsg, err);
      setError(errorMsg);
      setSelected(null);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 pointer-events-auto"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', duration: 0.4 }}
        className="bg-white rounded-3xl sm:rounded-[48px] p-4 sm:p-8 md:p-12 max-w-2xl sm:max-w-4xl w-full shadow-2xl relative overflow-hidden max-h-[90vh] overflow-y-auto"
      >
        {/* Background decorations */}
        <div className="absolute top-0 right-0 w-48 h-48 sm:w-96 sm:h-96 bg-[#A8D5BA]/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-32 h-32 sm:w-72 sm:h-72 bg-[#C3B1E1]/5 rounded-full blur-3xl" />

        <div className="relative z-10">
          {/* Header */}
          <div className="text-center mb-8 sm:mb-12">
            <motion.div
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="inline-flex items-center justify-center gap-3 sm:gap-4 mb-4 sm:mb-6"
            >
              <Zap size={32} className="sm:w-10 sm:h-10 text-[#A8D5BA]" />
              <h1 className="font-['Syne'] font-extrabold text-3xl sm:text-4xl md:text-5xl text-[#1A1A2E]">
                Join Your <span className="text-[#A8D5BA]">Faction</span>
              </h1>
            </motion.div>

            <motion.p
              initial={{ y: -10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-sm sm:text-base text-slate-600 font-semibold max-w-2xl mx-auto mb-2"
            >
              This is a one-time permanent choice. Your faction will control territory on the global map.
            </motion.p>
            <motion.p
              initial={{ y: -10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.25 }}
              className="text-xs sm:text-sm text-slate-500 max-w-2xl mx-auto"
            >
              Select a faction and click to join. You cannot change this later.
            </motion.p>
          </div>

          {/* Error message */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 sm:mb-8 p-4 sm:p-5 bg-red-50 border-2 border-red-300 rounded-2xl sm:rounded-3xl text-red-700 font-bold text-sm sm:text-base"
            >
              ⚠️ {error}
            </motion.div>
          )}

          {/* Faction cards grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 md:gap-8 mb-8 sm:mb-10">
            {FACTIONS.map((faction, i) => (
              <motion.button
                key={faction.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + i * 0.1 }}
                onClick={() => handleSelectFaction(faction.id)}
                disabled={isLoading}
                className={`relative group p-6 sm:p-8 rounded-3xl sm:rounded-4xl border-3 transition-all duration-300 ${
                  selected === faction.id
                    ? `shadow-xl sm:shadow-2xl`
                    : 'border-slate-200 hover:border-slate-300 hover:shadow-lg'
                } ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                style={
                  selected === faction.id
                    ? {
                        borderColor: faction.color,
                        backgroundColor: `${faction.color}0a`,
                        boxShadow: `0 0 30px ${faction.color}30`,
                      }
                    : {}
                }
              >
                <div className="relative z-10 text-center">
                  {/* Icon */}
                  <div className="text-6xl sm:text-7xl mb-4 sm:mb-6 transform transition-transform group-hover:scale-110">{faction.icon}</div>

                  {/* Faction name */}
                  <h3
                    className="font-['Syne'] font-extrabold text-2xl sm:text-3xl mb-2 sm:mb-3 transition-colors"
                    style={{
                      color: selected === faction.id ? faction.color : '#1A1A2E',
                    }}
                  >
                    {faction.name}
                  </h3>

                  {/* Tagline */}
                  <p className="text-xs sm:text-sm font-black uppercase tracking-widest mb-3 sm:mb-4 text-slate-500">
                    {faction.tagline}
                  </p>

                  {/* Description */}
                  <p className="text-sm sm:text-base font-semibold text-slate-600 mb-4 sm:mb-6 min-h-[50px] sm:min-h-[60px] leading-relaxed">
                    {faction.description}
                  </p>

                  {/* Selection button */}
                  {selected === faction.id ? (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="inline-block px-6 sm:px-8 py-2 sm:py-3 rounded-full text-sm sm:text-base font-black uppercase tracking-widest text-white transition-all"
                      style={{ backgroundColor: faction.color }}
                    >
                      ✓ SELECTED
                    </motion.div>
                  ) : (
                    <div
                      className="inline-block px-6 sm:px-8 py-2 sm:py-3 rounded-full text-sm sm:text-base font-black uppercase tracking-widest transition-all border-2"
                      style={{
                        color: faction.color,
                        borderColor: faction.color,
                        backgroundColor: 'transparent',
                      }}
                    >
                      SELECT
                    </div>
                  )}
                </div>
              </motion.button>
            ))}
          </div>

          {/* Info text */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="text-center"
          >
            <p className="text-xs sm:text-sm font-bold uppercase tracking-widest text-slate-400">
              🔒 Permanent Choice • 🗺️ Visible on Map • ⚔️ Global Wars
            </p>
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  );
}
