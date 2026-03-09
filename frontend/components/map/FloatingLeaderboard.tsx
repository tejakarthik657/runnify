'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, ChevronDown, ChevronUp, Zap, Map } from 'lucide-react';
import useSWR from 'swr';
import api from '../../services/api';

const fetcher = (url: string) => api.get(url).then(res => res.data);

interface FloatingLeaderboardProps {
  embedded?: boolean;
}

export default function FloatingLeaderboard({ embedded = false }: FloatingLeaderboardProps) {
  const [isMinimized, setIsMinimized] = useState(false);
  const { data: leaderboard } = useSWR('/leaderboard/daily?limit=10', fetcher, {
    refreshInterval: 10000, // Refresh every 10 seconds
  });

  const leaders = leaderboard?.leaderboard || [];

  return (
    <motion.div
      initial={embedded ? { y: 8, opacity: 0 } : { x: 300, opacity: 0 }}
      animate={embedded ? { y: 0, opacity: 1 } : { x: 0, opacity: 1 }}
      className={embedded ? 'w-full pointer-events-auto' : 'fixed right-4 top-24 z-[999] w-80 max-w-[calc(100vw-2rem)] pointer-events-auto'}
    >
      <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-black/5 shadow-2xl overflow-hidden">
        {/* Header */}
        <button
          onClick={() => setIsMinimized(!isMinimized)}
          className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors active:scale-[0.99]"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center shadow-md">
              <Trophy size={20} className="text-white" />
            </div>
            <div className="text-left">
              <h3 className="text-sm font-black uppercase tracking-tight text-[#1a1a2e]">Live Leaderboard</h3>
              <p className="text-[10px] font-bold text-gray-500">Top runners today</p>
            </div>
          </div>
          <motion.div
            animate={{ rotate: isMinimized ? 0 : 180 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronUp size={20} className="text-gray-400" />
          </motion.div>
        </button>

        {/* Content */}
        <AnimatePresence>
          {!isMinimized && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-4 space-y-2 max-h-[400px] overflow-y-auto">
                {leaders.length === 0 ? (
                  <div className="text-center py-8 text-gray-400 text-sm font-medium">
                    No runs today yet. Be the first! 🚀
                  </div>
                ) : (
                  leaders.map((entry: any, index: number) => (
                    <LeaderboardRow
                      key={entry.userId || index}
                      rank={entry.rank || index + 1}
                      username={entry.username}
                      faction={entry.faction}
                      hexesOwned={entry.hexesOwned || entry.hexes || 0}
                      credits={entry.credits || 0}
                      color={entry.color}
                    />
                  ))
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

interface LeaderboardRowProps {
  rank: number;
  username: string;
  faction?: string;
  hexesOwned: number;
  credits: number;
  color?: string;
}

function LeaderboardRow({ rank, username, faction, hexesOwned, credits, color }: LeaderboardRowProps) {
  const getRankStyle = () => {
    if (rank === 1) return 'bg-gradient-to-br from-yellow-400 to-amber-500 text-white';
    if (rank === 2) return 'bg-gradient-to-br from-gray-300 to-gray-400 text-white';
    if (rank === 3) return 'bg-gradient-to-br from-amber-600 to-amber-700 text-white';
    return 'bg-gray-100 text-gray-700';
  };

  const getFactionColor = () => {
    if (faction === 'red') return 'bg-red-100 text-red-700';
    if (faction === 'blue') return 'bg-blue-100 text-blue-700';
    if (faction === 'green') return 'bg-green-100 text-green-700';
    return 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-gray-50 to-white rounded-xl border border-black/5 hover:shadow-md transition-all">
      {/* Rank Badge */}
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black shadow-sm ${getRankStyle()}`}>
        {rank <= 3 ? ['🥇', '🥈', '🥉'][rank - 1] : `#${rank}`}
      </div>

      {/* User Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          {color && (
            <div className="w-3 h-3 rounded-full shadow-sm flex-shrink-0" style={{ backgroundColor: color }} />
          )}
          <span className="text-sm font-black text-[#1a1a2e] truncate">{username}</span>
          {faction && (
            <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase ${getFactionColor()}`}>
              {faction}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 mt-1">
          <div className="flex items-center gap-1">
            <Map size={10} className="text-[#2E7D52]" />
            <span className="text-[10px] font-bold text-gray-600">{hexesOwned}</span>
          </div>
          <div className="flex items-center gap-1">
            <Zap size={10} className="text-[#A594D3]" />
            <span className="text-[10px] font-bold text-gray-600">{credits}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
