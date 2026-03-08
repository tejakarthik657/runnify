'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Globe, MapPin, ChevronRight, Loader2, ArrowLeft, TrendingUp, Medal, Zap, Search } from 'lucide-react';
import Link from 'next/link';
import { useAuthStore } from '../../store/authStore';
import { useRealtimeLeaderboard } from '../../hooks/useRealtimeLeaderboard';
import Badge from '../../components/ui/Badge';

export default function LeaderboardPage() {
    const { user } = useAuthStore();
    const userCity = user?.city || 'Sector_01';
    const [scope, setScope] = useState<'global' | 'city'>('global');
    const [period, setPeriod] = useState<'alltime' | '24hour'>('alltime');
    const [query, setQuery] = useState('');

    const { entries, meRank, isLoading } = useRealtimeLeaderboard(scope, userCity, period);
    const currentData = entries;
    const normalizedQuery = query.trim().toLowerCase();
    const filteredData = normalizedQuery
        ? currentData.filter((entry: any) => {
            const username = (entry.username || '').toLowerCase();
            const city = (entry.city || '').toLowerCase();
            const rank = String(entry.rank || '');
            return username.includes(normalizedQuery) || city.includes(normalizedQuery) || rank.includes(normalizedQuery);
        })
        : currentData;

    return (
        <div className="min-h-screen pb-20">
            <div className="max-w-5xl mx-auto space-y-8">

                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 sm:gap-4 mb-4">
                    <div className="flex items-center gap-3 sm:gap-4">
                        <Link href="/dashboard" className="p-2 sm:p-4 bg-white rounded-2xl border border-black/5 shadow-sm hover:shadow-md transition-all active:scale-95 flex-shrink-0">
                            <ArrowLeft size={20} className="sm:w-6 sm:h-6 text-[#1a1a2e]" />
                        </Link>
                        <div className="min-w-0">
                            <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-black tracking-tight text-[#1a1a2e] truncate">Hall of Fame</h1>
                            <div className="flex items-center gap-1 sm:gap-2 mt-1 flex-wrap">
                                <Badge variant="sage" className="text-[10px] sm:text-xs">Season 1</Badge>
                                {period === '24hour' ? (
                                    <Badge variant="sage" className="text-[10px] sm:text-xs bg-[#F4B8C1] text-[#c0392b]">24h Reset</Badge>
                                ) : (
                                    <span className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-widest hidden sm:inline">All-Time Rankings</span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Tab Selector Scope */}
                    <div className="flex gap-2">
                        <div className="flex bg-white rounded-2xl border border-black/5 p-1 sm:p-1.5 shadow-sm">
                            {(['global', 'city'] as const).map((s) => (
                                <button
                                    key={s}
                                    onClick={() => setScope(s)}
                                    className={`px-3 sm:px-6 md:px-8 py-2 sm:py-2.5 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all ${scope === s
                                            ? 'bg-[#A8D5BA] text-white shadow-md'
                                            : 'text-gray-400 hover:text-[#1a1a2e]'
                                        }`}
                                >
                                    {s === 'city' ? userCity : s}
                                </button>
                            ))}
                        </div>

                        {/* Period Selector */}
                        <div className="flex bg-white rounded-2xl border border-black/5 p-1 sm:p-1.5 shadow-sm">
                            {(['alltime', '24hour'] as const).map((p) => (
                                <button
                                    key={p}
                                    onClick={() => setPeriod(p)}
                                    className={`px-3 sm:px-4 md:px-6 py-2 sm:py-2.5 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${period === p
                                            ? 'bg-[#A8D5BA] text-white shadow-md'
                                            : 'text-gray-400 hover:text-[#1a1a2e]'
                                        }`}
                                >
                                    {p === '24hour' ? '24hr' : 'all-time'}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Current User Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="relative overflow-hidden rounded-[40px] bg-white border border-black/5 p-4 sm:p-6 md:p-8 lg:p-10 shadow-sm"
                >
                    <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-6 md:gap-8">
                        <div className="flex items-center gap-3 sm:gap-4 md:gap-6">
                            <div className="relative">
                                {user?.avatarUrl ? (
                                    <div className="w-20 h-20 rounded-[28px] overflow-hidden shadow-inner border-2 border-white">
                                        <img src={user.avatarUrl} alt={user.username} className="w-full h-full object-cover" />
                                    </div>
                                ) : (
                                    <div className="w-20 h-20 rounded-[28px] bg-[#F0F7F4] flex items-center justify-center text-3xl font-black text-[#2E7D52] shadow-inner border-2 border-white">
                                        {user?.username?.charAt(0).toUpperCase()}
                                    </div>
                                )}
                                <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-lg border border-black/5 text-[#A8D5BA]">
                                    <Trophy size={20} fill="currentColor" />
                                </div>
                            </div>
                            <div>
                                <div className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Your Standing</div>
                                <h2 className="text-2xl font-black text-[#1a1a2e]">{user?.username || 'Player'}</h2>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-3 gap-8 md:gap-16">
                            <div>
                                <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Global Rank</div>
                                <div className="text-3xl font-black text-[#A8D5BA]">#{meRank?.rank || meRank?.userRank?.rank || '---'}</div>
                            </div>
                            <div>
                                <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total TRC</div>
                                <div className="text-3xl font-black text-[#1a1a2e]">{(user?.credits || 0).toLocaleString()}</div>
                            </div>
                            <div className="hidden md:block">
                                <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Territory</div>
                                <div className="text-3xl font-black text-[#A594D3]">{user?.hexesOwned || 0} HEX</div>
                            </div>
                        </div>
                    </div>
                    {/* Decorative Gradient Background */}
                    <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-[#F0F7F4] to-transparent pointer-events-none" />
                </motion.div>

                {/* Leaderboard Table Container */}
                <div className="bg-white rounded-[40px] border border-black/5 shadow-sm overflow-hidden min-h-[500px]">
                    <div className="p-4 md:px-8 md:pt-8 md:pb-2 border-b border-black/5 bg-[#FAFCFA]">
                        <div className="relative max-w-md">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Search by username, city, or rank"
                                className="w-full rounded-xl border border-black/10 bg-white pl-9 pr-3 py-2 text-sm font-semibold text-[#1a1a2e] outline-none focus:ring-2 focus:ring-[#A8D5BA]/40"
                            />
                        </div>
                        {normalizedQuery && (
                            <p className="mt-2 text-[11px] font-bold text-gray-500">
                                Showing {filteredData.length} result{filteredData.length === 1 ? '' : 's'} for "{query}"
                            </p>
                        )}
                    </div>

                    {isLoading ? (
                        <div className="h-[500px] flex flex-col items-center justify-center px-6">
                            {/* Animated Loading State with Skeleton */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="w-full max-w-2xl space-y-6"
                            >
                                {/* Pulsing Trophy Icon */}
                                <motion.div
                                    animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }}
                                    transition={{ duration: 2, repeat: Infinity }}
                                    className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-br from-[#A8D5BA] to-[#6CC89A] flex items-center justify-center shadow-2xl shadow-[#A8D5BA]/30"
                                >
                                    <Trophy size={36} className="text-white" fill="white" fillOpacity={0.3} />
                                </motion.div>

                                <div className="text-center mb-8">
                                    <h3 className="text-xl font-black text-[#1a1a2e] mb-2">Syncing Global Ranks...</h3>
                                    <p className="text-sm font-bold text-gray-400">Calculating territory dominance across {period === '24hour' ? '24 hours' : 'all time'}</p>
                                </div>

                                {/* Skeleton Leaderboard Entries */}
                                <div className="space-y-3">
                                    {[1, 2, 3, 4, 5].map((i) => (
                                        <motion.div
                                            key={i}
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: i * 0.1 }}
                                            className="flex items-center gap-6 p-5 rounded-3xl bg-gray-50/80 border border-gray-100"
                                        >
                                            <div className="w-12 text-center">
                                                <div className="inline-block w-8 h-8 rounded-xl bg-gray-200 animate-pulse" />
                                            </div>
                                            <div className="flex items-center gap-4 flex-1">
                                                <div className="w-12 h-12 rounded-2xl bg-gray-200 animate-pulse" />
                                                <div className="flex-1 space-y-2">
                                                    <div className="h-4 bg-gray-200 rounded-lg w-32 animate-pulse" />
                                                    <div className="h-3 bg-gray-200 rounded-lg w-24 animate-pulse" />
                                                </div>
                                            </div>
                                            <div className="w-20 h-8 bg-gray-200 rounded-lg animate-pulse" />
                                        </motion.div>
                                    ))}
                                </div>

                                {/* Motivational Tip */}
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 1.5 }}
                                    className="flex items-start gap-3 bg-[#F0F7F4] border border-[#A8D5BA]/20 rounded-2xl p-4 mt-6"
                                >
                                    <Zap size={16} className="text-[#A8D5BA] flex-shrink-0 mt-0.5" />
                                    <p className="text-[10px] font-bold text-gray-600 leading-relaxed">
                                        <span className="font-black text-[#2E7D52]">DID YOU KNOW?</span> The top 10 players change {period === '24hour' ? 'every few hours' : 'daily'}. One strategic run in unclaimed territory could boost your rank by 20+ positions.
                                    </p>
                                </motion.div>
                            </motion.div>
                        </div>
                    ) : filteredData && filteredData.length > 0 ? (
                        <div className="p-4 md:p-8">
                            <div className="space-y-3">
                                {filteredData.map((entry: any, index: number) => {
                                    const rank = entry.rank || index + 1;
                                    const isMe = entry.userId === user?.id;
                                    return (
                                        <motion.div
                                            key={entry.userId || `${entry.username}-${rank}`}
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: index * 0.05 }}
                                            className={`
                                                group flex items-center justify-between p-5 rounded-3xl transition-all border
                                                ${isMe ? 'bg-[#F0F7F4] border-[#A8D5BA]/30 shadow-sm' : 'bg-gray-50/50 border-transparent hover:bg-white hover:border-black/5 hover:shadow-md'}
                                            `}
                                        >
                                            <div className="flex items-center gap-6">
                                                <div className="w-12 text-center">
                                                    {rank === 1 ? (
                                                        <div className="inline-flex w-10 h-10 items-center justify-center bg-yellow-100 text-yellow-600 rounded-xl shadow-sm">
                                                            <Medal size={20} fill="currentColor" />
                                                        </div>
                                                    ) : rank === 2 ? (
                                                        <div className="inline-flex w-10 h-10 items-center justify-center bg-gray-100 text-gray-500 rounded-xl shadow-sm">
                                                            <Medal size={20} fill="currentColor" />
                                                        </div>
                                                    ) : rank === 3 ? (
                                                        <div className="inline-flex w-10 h-10 items-center justify-center bg-orange-100 text-orange-600 rounded-xl shadow-sm">
                                                            <Medal size={20} fill="currentColor" />
                                                        </div>
                                                    ) : (
                                                        <span className="text-lg font-black text-gray-300 tabular-nums">
                                                            {rank.toString().padStart(2, '0')}
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center text-sm font-black text-[#1a1a2e] shadow-sm border border-black/5" style={{ color: entry.color }}>
                                                        {entry.username?.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <div className="text-sm font-black text-[#1a1a2e] flex items-center gap-2">
                                                            {entry.username}
                                                            {isMe && <Badge variant="sage" className="scale-75 origin-left">YOU</Badge>}
                                                        </div>
                                                        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
                                                            {entry.city || 'Wild_Zone'} • {entry.hexesOwned || 0} HEX
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-8">
                                                <div className="text-right hidden sm:block">
                                                    <div className="text-xs font-black text-gray-400 uppercase tracking-widest mb-0.5">Performance</div>
                                                    <div className="flex items-center gap-1 text-[10px] text-[#A8D5BA] font-black uppercase">
                                                        <TrendingUp size={12} /> {Math.round(entry.totalKm || 0)} KM TOTAL
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-base font-black text-[#1a1a2e] group-hover:text-[#2E7D52] transition-colors tabular-nums">
                                                        {entry.credits.toLocaleString()}
                                                    </div>
                                                    <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Yield</div>
                                                </div>
                                                <ChevronRight size={18} className="text-gray-300 opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" />
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        </div>
                    ) : (
                        <div className="h-[500px] flex flex-col items-center justify-center text-center p-12">
                            <div className="w-24 h-24 bg-gray-50 rounded-[40px] flex items-center justify-center text-gray-200 mb-6">
                                <Trophy size={48} />
                            </div>
                            <h3 className="text-xl font-black text-[#1a1a2e] mb-2">
                                {normalizedQuery ? 'No Matching Players' : 'The Stadium is Empty'}
                            </h3>
                            <p className="text-sm font-bold text-gray-400 uppercase tracking-widest italic max-w-xs">
                                {normalizedQuery
                                    ? 'Try another username, city, or rank search.'
                                    : 'No intel recovered in this sector yet. Be the first to claim your spot on the grid!'}
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
