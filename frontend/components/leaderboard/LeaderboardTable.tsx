'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { useAuthStore } from '../../store/authStore';
import RankBadge from './RankBadge';
import { ChevronRight, ArrowUpRight, ArrowDownRight, Minus, Crosshair, Zap } from 'lucide-react';

// Design Tokens from Documentation
const COLORS = {
    deepNavy: '#0D0D1A',
    electricGreen: '#00C896',
    neonOrange: '#FF6B35',
    ghostWhite: '#E8E8F0',
    mutedSlate: '#6B7280',
    dangerRed: '#FF2244'
};

interface LeaderboardEntry {
    userId: string;
    username: string;
    color: string;
    credits: number;
    hexesOwned: number;
    rank: number;
    rankDelta?: number;
}

interface LeaderboardTableProps {
    entries: LeaderboardEntry[];
    isLoading?: boolean;
}

export default function LeaderboardTable({ entries, isLoading }: LeaderboardTableProps) {
    const { user: currentUser } = useAuthStore();

    if (isLoading) {
        return (
            <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-16 bg-white/[0.02] border border-white/5 animate-pulse" />
                ))}
            </div>
        );
    }

    return (
        <div className="space-y-2 font-['Inter']">
            {entries.map((entry, index) => {
                const isCurrent = entry.userId === currentUser?.id;
                
                return (
                    <motion.div
                        key={entry.userId}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.2, delay: index * 0.03 }}
                        className={`group relative flex items-center justify-between p-4 border transition-all ${
                            isCurrent
                                ? 'bg-[#00C896]/5 border-[#00C896]/40 shadow-[inset_0_0_20px_rgba(0,200,150,0.05)]'
                                : 'bg-white/[0.02] border-white/5 hover:border-white/20'
                        }`}
                    >
                        {/* 5.5 Leaderboard highlighting - subtle glow for current user */}
                        {isCurrent && (
                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#00C896]" />
                        )}

                        <div className="flex items-center gap-6">
                            {/* 4.3 Rank Number in Space Grotesk */}
                            <div className="w-12 text-center">
                                <span className={`text-xl font-black font-['Space_Grotesk'] italic ${
                                    entry.rank <= 3 ? 'text-yellow-400' : 'text-[#6B7280]'
                                }`}>
                                    #{entry.rank.toString().padStart(2, '0')}
                                </span>
                            </div>

                            <div className="flex items-center gap-4">
                                {/* Tactical Avatar - Sharp Corners */}
                                <div
                                    className="w-10 h-10 border flex items-center justify-center text-xs font-black transition-transform group-hover:scale-105"
                                    style={{ 
                                        backgroundColor: `${entry.color}15`, 
                                        borderColor: entry.color,
                                        color: entry.color 
                                    }}
                                >
                                    {entry.username.charAt(0).toUpperCase()}
                                </div>
                                
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-black uppercase tracking-widest text-[#E8E8F0]">
                                            {entry.username}
                                        </span>
                                        {isCurrent && (
                                            <span className="text-[8px] font-black bg-[#00C896] text-[#0D0D1A] px-1.5 py-0.5 tracking-tighter">
                                                LOCAL_NODE
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-3 mt-1">
                                        <div className="flex items-center gap-1 text-[9px] font-bold text-[#6B7280] uppercase tracking-tighter">
                                            <Crosshair size={10} /> {entry.hexesOwned} SEC_UNITS
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-12">
                            {/* Stats Readout */}
                            <div className="hidden md:flex flex-col items-end">
                                <div className="flex items-center gap-1.5 text-xs font-black font-['JetBrains_Mono'] text-[#E8E8F0]">
                                    <Zap size={12} className="text-[#00C896]" />
                                    {entry.credits.toLocaleString()}
                                </div>
                                <div className="text-[9px] font-bold text-[#6B7280] uppercase tracking-widest mt-0.5">
                                    CREDIT_INTEL
                                </div>
                            </div>

                            {/* Rank Change Indicators - Section 5.5 */}
                            <div className="w-16 flex flex-col items-center justify-center">
                                {entry.rankDelta && entry.rankDelta > 0 ? (
                                    <div className="flex items-center text-[#00C896] text-[10px] font-black">
                                        <ArrowUpRight size={12} /> {entry.rankDelta}
                                    </div>
                                ) : entry.rankDelta && entry.rankDelta < 0 ? (
                                    <div className="flex items-center text-[#FF2244] text-[10px] font-black">
                                        <ArrowDownRight size={12} /> {Math.abs(entry.rankDelta)}
                                    </div>
                                ) : (
                                    <div className="flex items-center text-[#6B7280] opacity-40">
                                        <Minus size={12} />
                                    </div>
                                )}
                            </div>

                            <ChevronRight size={14} className="text-[#6B7280] group-hover:text-white transition-colors" />
                        </div>
                    </motion.div>
                );
            })}
        </div>
    );
}