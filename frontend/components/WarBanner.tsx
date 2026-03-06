'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useSocket } from '../hooks/useSocket';
import api from '../services/api';

interface WarBannerProps {
  isHidden?: boolean;
}

interface FactionStats {
  red: number;
  blue: number;
  green: number;
  total: number;
}

const FACTION_CONFIG = {
  red: { color: '#FF4444', name: 'Red Legion', icon: '🔴' },
  blue: { color: '#4488FF', name: 'Blue Syndicate', icon: '🔵' },
  green: { color: '#44FF88', name: 'Green Nomads', icon: '🟢' },
};

export default function WarBanner({ isHidden = false }: WarBannerProps) {
  const [stats, setStats] = useState<FactionStats>({
    red: 0,
    blue: 0,
    green: 0,
    total: 0,
  });
  const [loading, setLoading] = useState(true);
  const socket = useSocket('main');

  // Fetch initial faction stats
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await api.get('/leaderboard/factions');
        const data = response.data;
        
        // Calculate total hexes per faction
        const factionTotals = {
          red: 0,
          blue: 0,
          green: 0,
        };

        (data.cities || []).forEach((city: any) => {
          factionTotals.red += city.redCount || 0;
          factionTotals.blue += city.blueCount || 0;
          factionTotals.green += city.greenCount || 0;
        });

        const total = factionTotals.red + factionTotals.blue + factionTotals.green || 1;
        
        setStats({
          red: factionTotals.red,
          blue: factionTotals.blue,
          green: factionTotals.green,
          total,
        });
      } catch (error) {
        console.error('Failed to fetch faction stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  // Listen for real-time faction updates via Socket.io
  useEffect(() => {
    if (!socket) return;
    
    const handleFactionUpdated = (data: any) => {
      setStats((prev) => {
        const updated = { ...prev };
        const faction = data.faction as keyof FactionStats;
        if (faction in updated && faction !== 'total') {
          updated[faction] += data.hexesClaimed || 0;
          updated.total = updated.red + updated.blue + updated.green;
        }
        return updated;
      });
    };

    socket.on('faction_updated', handleFactionUpdated);

    return () => {
      socket.off('faction_updated', handleFactionUpdated);
    };
  }, [socket]);

  if (isHidden || loading) {
    return null;
  }

  const redPercent = ((stats.red / stats.total) * 100).toFixed(1);
  const bluePercent = ((stats.blue / stats.total) * 100).toFixed(1);
  const greenPercent = ((stats.green / stats.total) * 100).toFixed(1);

  return (
    <motion.div
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: 'spring', duration: 0.6 }}
      className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-b from-black/60 to-black/30 backdrop-blur-sm border-b border-white/10"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
        {/* Title */}
        <div className="mb-2 sm:mb-4">
          <h2 className="text-[10px] sm:text-xs md:text-sm font-black uppercase tracking-widest text-white/70 flex items-center gap-2">
            <Zap size={12} className="text-yellow-400 sm:w-3.5 sm:h-3.5" />
            <span className="hidden sm:inline">Global Territory War</span>
            <span className="sm:hidden">Territory War</span>
          </h2>
        </div>

        {/* Faction Bar */}
        <div className="space-y-2 sm:space-y-3">
          {/* Visual Bar */}
          <div className="flex gap-0.5 sm:gap-1 h-4 sm:h-6 rounded-full overflow-hidden bg-black/30 border border-white/10">
            <motion.div
              key={`red-${stats.red}`}
              initial={{ width: 0 }}
              animate={{ width: `${redPercent}%` }}
              transition={{ type: 'spring', stiffness: 50, damping: 20 }}
              className="bg-gradient-to-r from-[#FF4444] to-[#FF6666] hover:from-[#FF5555] hover:to-[#FF7777] transition-all relative group"
              style={{ minWidth: parseFloat(redPercent) > 5 ? 'auto' : '0' }}
            >
              <div className="absolute inset-0 bg-white/10 blur-sm animate-pulse" />
            </motion.div>

            <motion.div
              key={`blue-${stats.blue}`}
              initial={{ width: 0 }}
              animate={{ width: `${bluePercent}%` }}
              transition={{ type: 'spring', stiffness: 50, damping: 20 }}
              className="bg-gradient-to-r from-[#4488FF] to-[#6699FF] hover:from-[#5599FF] hover:to-[#77AAFF] transition-all relative group"
              style={{ minWidth: parseFloat(bluePercent) > 5 ? 'auto' : '0' }}
            >
              <div className="absolute inset-0 bg-white/10 blur-sm animate-pulse" />
            </motion.div>

            <motion.div
              key={`green-${stats.green}`}
              initial={{ width: 0 }}
              animate={{ width: `${greenPercent}%` }}
              transition={{ type: 'spring', stiffness: 50, damping: 20 }}
              className="bg-gradient-to-r from-[#44FF88] to-[#66FF99] hover:from-[#55FF99] hover:to-[#77FFAA] transition-all relative group"
              style={{ minWidth: parseFloat(greenPercent) > 5 ? 'auto' : '0' }}
            >
              <div className="absolute inset-0 bg-white/10 blur-sm animate-pulse" />
            </motion.div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-2 sm:gap-4">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="flex items-center gap-1.5 sm:gap-3 p-1.5 sm:p-2 rounded-lg bg-red-500/10 border border-red-500/20 hover:bg-red-500/15 transition-colors"
            >
              <span className="text-sm sm:text-lg">{FACTION_CONFIG.red.icon}</span>
              <div className="min-w-0">
                <div className="text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-red-600/80 hidden sm:block">Red Legion</div>
                <div className="text-xs sm:text-sm md:text-base font-black text-red-600 tabular-nums">{redPercent}%</div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="flex items-center gap-1.5 sm:gap-3 p-1.5 sm:p-2 rounded-lg bg-blue-500/10 border border-blue-500/20 hover:bg-blue-500/15 transition-colors"
            >
              <span className="text-sm sm:text-lg">{FACTION_CONFIG.blue.icon}</span>
              <div className="min-w-0">
                <div className="text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-blue-600/80 hidden sm:block">Blue Syndicate</div>
                <div className="text-xs sm:text-sm md:text-base font-black text-blue-600 tabular-nums">{bluePercent}%</div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex items-center gap-1.5 sm:gap-3 p-1.5 sm:p-2 rounded-lg bg-green-500/10 border border-green-500/20 hover:bg-green-500/15 transition-colors"
            >
              <span className="text-sm sm:text-lg">{FACTION_CONFIG.green.icon}</span>
              <div className="min-w-0">
                <div className="text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-green-600/80 hidden sm:block">Green Nomads</div>
                <div className="text-xs sm:text-sm md:text-base font-black text-green-600 tabular-nums">{greenPercent}%</div>
              </div>
            </motion.div>
          </div>

          {/* Total hexes */}
          <div className="text-center hidden sm:block">
            <p className="text-[9px] font-bold text-white/50 uppercase tracking-widest">
              Total Hexes Controlled: <span className="text-white font-black">{stats.total.toLocaleString()}</span>
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// Import Zap icon
function Zap({ size, className }: { size: number; className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
    </svg>
  );
}
