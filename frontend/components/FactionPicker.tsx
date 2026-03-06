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
      const response = await api.patch('/user/me/faction', { faction: factionId });
      if (response.status === 200) {
        onFactionSelected(factionId);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to select faction');
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
      className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4"
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
          <div className="text-center mb-6 sm:mb-12">
            <motion.div
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="inline-flex items-center justify-center gap-2 sm:gap-3 mb-3 sm:mb-6"
            >
              <Zap size={24} className="sm:w-8 sm:h-8 text-[#A8D5BA]" />
              <h1 className="font-['Syne'] font-extrabold text-2xl sm:text-4xl md:text-5xl text-[#1A1A2E]">
                Choose <span className="text-[#A8D5BA]">Faction</span>
              </h1>
            </motion.div>

            <motion.p
              initial={{ y: -10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-xs sm:text-sm text-slate-400 font-bold max-w-xl mx-auto"
            >
              Permanent choice. Control the world map for your faction.
            </motion.p>
          </div>

          {/* Error message */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 sm:mb-6 p-3 sm:p-4 bg-[#FF4444]/10 border border-[#FF4444]/30 rounded-xl sm:rounded-2xl text-[#FF4444] font-bold text-xs sm:text-sm"
            >
              {error}
            </motion.div>
          )}

          {/* Faction cards grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-6 mb-6 sm:mb-8">
            {FACTIONS.map((faction, i) => (
              <motion.button
                key={faction.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + i * 0.1 }}
                onClick={() => handleSelectFaction(faction.id)}
                disabled={isLoading}
                className={`relative group p-3 sm:p-6 rounded-2xl sm:rounded-3xl border-2 transition-all duration-300 ${
                  selected === faction.id
                    ? `border-[${faction.color}] bg-[${faction.color}]/5 shadow-lg sm:shadow-[0_0_30px_rgba(255,68,68,0.2)]`
                    : 'border-black/5 hover:border-black/10 hover:shadow-md sm:hover:shadow-lg'
                } ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                style={
                  selected === faction.id
                    ? {
                        borderColor: faction.color,
                        backgroundColor: `${faction.color}08`,
                        boxShadow: `0 0 20px ${faction.color}15`,
                      }
                    : {}
                }
              >
                <div className="relative z-10">
                  {/* Icon */}
                  <div className="text-3xl sm:text-5xl mb-2 sm:mb-4">{faction.icon}</div>

                  {/* Faction name */}
                  <h3
                    className="font-['Syne'] font-extrabold text-lg sm:text-2xl mb-1 sm:mb-2 transition-colors"
                    style={{
                      color: selected === faction.id ? faction.color : '#1A1A2E',
                    }}
                  >
                    {faction.name}
                  </h3>

                  {/* Tagline */}
                  <p className="text-[10px] sm:text-xs font-black uppercase tracking-widest mb-2 sm:mb-3 text-slate-400">
                    {faction.tagline}
                  </p>

                  {/* Description */}
                  <p className="text-xs sm:text-sm font-bold text-slate-500 mb-3 sm:mb-6 min-h-[40px] sm:min-h-[60px]">
                    {faction.description}
                  </p>

                  {/* Selection indicator */}
                  {selected === faction.id && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="inline-block px-3 sm:px-4 py-1 sm:py-2 rounded-full text-[10px] sm:text-xs font-black uppercase tracking-widest text-white"
                      style={{ backgroundColor: faction.color }}
                    >
                      ✓ Selected
                    </motion.div>
                  )}

                  {selected !== faction.id && (
                    <div
                      className="inline-block px-3 sm:px-4 py-1 sm:py-2 rounded-full text-[10px] sm:text-xs font-black uppercase tracking-widest group-hover:text-white transition-colors"
                      style={{
                        color: faction.color,
                        borderColor: faction.color,
                      }}
                    >
                      Choose
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
            <p className="text-[8px] sm:text-[9px] font-black uppercase tracking-widest text-slate-400">
              Permanent • Visible on map
            </p>
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  );
}
