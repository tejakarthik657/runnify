'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, Play, Shield, Zap, Target, Globe, MessageSquare, Lock, BarChart3, Users, Sparkles, Map as MapIcon, Hexagon, ArrowRight, Radio } from 'lucide-react';
import api from '../../services/api';

// --- DESIGN TOKENS ---
const C = {
    bg: '#F4F7F4',
    white: '#FFFFFF',
    sage: '#A8D5BA',
    sageDark: '#6CC89A',
    sageDeep: '#2E7D52',
    rose: '#F4B8C1',
    roseDark: '#E89BA5',
    lavender: '#C3B1E1',
    peach: '#FFD6A5',
    sky: '#B5D5F5',
    ink: '#1A1A2E',
    muted: '#64748B',
    border: 'rgba(0,0,0,0.06)',
};

const fetcher = (url: string) => api.get(url).then(res => res.data);

// --- COMPONENTS ---

const HexPoints = (cx: number, cy: number, r: number) => {
    return Array.from({ length: 6 }, (_, i) => {
        const a = (Math.PI / 180) * (60 * i - 30);
        return `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`;
    }).join(' ');
};

function DecorativeHexGrid() {
    const R = 28;
    const W = R * Math.sqrt(3);
    const H = R * 2;
    const rows = 8;
    const cols = 12;

    const hexes = [];
    for (let ri = 0; ri < rows; ri++) {
        for (let ci = 0; ci < cols; ci++) {
            const cx = ci * W + (ri % 2 === 1 ? W / 2 : 0);
            const cy = ri * (H * 0.75);
            const type = Math.random() > 0.92 ? Math.floor(Math.random() * 3) + 1 : 0; // 0=none, 1=sage, 2=rose, 3=lavender
            hexes.push({ cx, cy, type, id: `${ri}-${ci}` });
        }
    }

    const COLORS = [null, C.sage, C.rose, C.lavender];

    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-40 select-none" style={{ maskImage: 'radial-gradient(circle at center, black, transparent 80%)' }}>
            <svg width="100%" height="100%" viewBox={`0 0 ${cols * W} ${rows * H * 0.75}`}>
                {hexes.map((h) => (
                    <motion.polygon
                        key={h.id}
                        points={HexPoints(h.cx, h.cy, R - 3)}
                        fill={(h.type > 0 ? COLORS[h.type] : 'transparent') as string}
                        stroke={h.type > 0 ? 'white' : 'rgba(168,213,186,0.15)'}
                        strokeWidth={h.type > 0 ? 1.5 : 1}
                        initial={{ opacity: 0 }}
                        animate={{
                            opacity: h.type > 0 ? [0.3, 0.6, 0.3] : 0.15,
                            scale: h.type > 0 ? [1, 1.05, 1] : 1
                        }}
                        transition={{
                            duration: Math.random() * 4 + 3,
                            repeat: Infinity,
                            ease: "easeInOut"
                        }}
                    />
                ))}
            </svg>
        </div>
    );
}

function StatTicker({ stats }: { stats: any }) {
    const isLoading = !stats;
    
    if (isLoading) {
        return (
            <div className="py-6 bg-white/80 backdrop-blur-md border-y border-black/5 overflow-hidden relative z-10">
                <div className="flex gap-20 items-center justify-center">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="flex items-center gap-4 animate-pulse">
                            <div className="w-24 h-3 bg-slate-200 rounded" />
                            <div className="w-16 h-4 bg-slate-300 rounded" />
                            <div className="w-1.5 h-1.5 rounded-full bg-slate-200" />
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    const items = [
        { label: 'Territories Claimed', value: stats.totalHexes?.toLocaleString() || '0', color: C.sage },
        { label: 'Active Runners', value: stats.onlineCount?.toLocaleString() || '0', color: C.sageDark },
        { label: 'Total Players', value: stats.totalUsers?.toLocaleString() || '0', color: C.sky },
        { label: 'Distance This Week', value: stats.distanceWeek ? `${stats.distanceWeek.toLocaleString()} km` : '0 km', color: C.peach },
        { label: 'Credits In Circulation', value: stats.totalCredits > 1000000 ? `${(stats.totalCredits / 1000000).toFixed(1)}M` : stats.totalCredits?.toLocaleString() || '0', color: C.lavender },
        { label: 'Invasions Today', value: stats.territoriesInvadedToday?.toLocaleString() || '0', color: C.rose },
    ];

    const scrollItems = [...items, ...items, ...items];

    return (
        <div className="py-6 bg-white/80 backdrop-blur-md border-y border-black/5 overflow-hidden whitespace-nowrap relative z-10">
            <motion.div
                className="flex gap-20 items-center"
                animate={{ x: [0, -1200] }}
                transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
            >
                {scrollItems.map((s, i) => (
                    <div key={i} className="flex items-center gap-4 group">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 group-hover:text-[#A8D5BA] transition-colors">{s.label}</span>
                        <span className="text-sm font-black text-[#1A1A2E]">{s.value}</span>
                        <div className="w-1.5 h-1.5 rounded-full shadow-sm" style={{ backgroundColor: s.color }} />
                    </div>
                ))}
            </motion.div>
        </div>
    );
}

function FeatureCard({ icon: Icon, title, desc, color, delay }: any) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay }}
            whileHover={{ y: -10, scale: 1.02 }}
            className="p-6 sm:p-8 md:p-10 bg-white border border-black/5 rounded-[32px] sm:rounded-[40px] md:rounded-[48px] shadow-sm hover:shadow-2xl hover:shadow-green-100/50 transition-all group relative overflow-hidden"
        >
            <div className={`absolute top-0 right-0 w-24 sm:w-28 md:w-32 h-24 sm:h-28 md:h-32 opacity-5 rounded-bl-[100px] transition-transform group-hover:scale-110`} style={{ backgroundColor: color }} />
            <div
                className="w-12 sm:w-14 md:w-16 h-12 sm:h-14 md:h-16 rounded-2xl sm:rounded-[28px] md:rounded-3xl flex items-center justify-center mb-4 sm:mb-6 md:mb-8 shadow-lg transition-transform group-hover:rotate-6 group-hover:scale-110 border-2 border-white"
                style={{ backgroundColor: `${color}15`, color: color }}
            >
                <Icon size={24} className="sm:w-7 sm:h-7 md:w-8 md:h-8" strokeWidth={2.5} />
            </div>
            <h3 className="font-['Syne'] font-extrabold text-lg sm:text-xl md:text-2xl mb-2 sm:mb-3 md:mb-4 text-[#1A1A2E] tracking-tight">{title}</h3>
            <p className="text-slate-400 font-bold text-xs sm:text-sm leading-relaxed">{desc}</p>
        </motion.div>
    );
}

function TopCommandersPodium({ commanders }: { commanders: any[] }) {
    if (!commanders || commanders.length === 0) {
        return (
            <div className="flex items-center justify-center gap-4 py-12">
                {[1, 2, 3].map(i => (
                    <div key={i} className="animate-pulse bg-slate-100 rounded-3xl p-6 w-48 h-56" />
                ))}
            </div>
        );
    }

    const medals = ['🥇', '🥈', '🥉'];
    const heights = ['h-64', 'h-56', 'h-48'];

    return (
        <div className="flex items-end justify-center gap-4 sm:gap-8 py-8 flex-wrap">
            {commanders.map((c, i) => (
                <motion.div
                    key={c.userId}
                    initial={{ opacity: 0, y: 40 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: i * 0.15 }}
                    className={`bg-white border-2 border-black/5 rounded-[32px] p-6 shadow-xl hover:shadow-2xl hover:-translate-y-2 transition-all group ${heights[i]} w-48 flex flex-col justify-between`}
                    style={{ borderColor: i === 0 ? C.sage : 'rgba(0,0,0,0.05)' }}
                >
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-4xl">{medals[i]}</span>
                            <div className="w-3 h-3 rounded-full shadow-lg" style={{ backgroundColor: c.color }} />
                        </div>
                        <div className="mb-2">
                            <p className="font-['Syne'] font-extrabold text-xl text-[#1A1A2E] truncate">{c.username}</p>
                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-300">{c.hashcode}</p>
                        </div>
                        {c.city && (
                            <div className="bg-[#F0F7F4] px-2 py-1 rounded-lg inline-block mb-3">
                                <span className="text-[9px] font-black uppercase tracking-wider text-[#2E7D52]">{c.city}</span>
                            </div>
                        )}
                    </div>
                    <div className="space-y-2 border-t border-black/5 pt-4">
                        <div className="flex justify-between items-center">
                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Credits</span>
                            <span className="text-sm font-black text-[#A8D5BA]">{(c.credits / 1000).toFixed(1)}K</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Hexes</span>
                            <span className="text-sm font-black text-[#1A1A2E]">{c.hexesOwned}</span>
                        </div>
                        {c.currentStreak > 0 && (
                            <div className="flex justify-between items-center">
                                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Streak</span>
                                <span className="text-sm font-black text-[#F4B8C1]">{c.currentStreak}🔥</span>
                            </div>
                        )}
                    </div>
                </motion.div>
            ))}
        </div>
    );
}

function LiveCityHeatmap({ cities }: { cities: any[] }) {
    if (!cities || cities.length === 0) {
        return (
            <div className="space-y-3">
                {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className="animate-pulse flex items-center gap-3">
                        <div className="w-full h-8 bg-slate-100 rounded-xl" />
                    </div>
                ))}
            </div>
        );
    }

    const maxHexes = Math.max(...cities.map(c => c.hexesCaptured));

    return (
        <div className="space-y-3">
            {cities.map((city, i) => (
                <motion.div
                    key={city.city}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: i * 0.05 }}
                    className="group cursor-pointer"
                >
                    <div className="flex items-center gap-3 mb-1">
                        <span className="text-xs font-black text-slate-400 w-6">#{i + 1}</span>
                        <span className="text-sm font-bold text-[#1A1A2E] flex-1">{city.city}</span>
                        <span className="text-xs font-black text-[#A8D5BA]">{city.hexesCaptured} hexes</span>
                    </div>
                    <div className="relative h-2 bg-slate-100 rounded-full overflow-hidden ml-9">
                        <motion.div
                            initial={{ width: 0 }}
                            whileInView={{ width: `${(city.hexesCaptured / maxHexes) * 100}%` }}
                            viewport={{ once: true }}
                            transition={{ duration: 1, delay: i * 0.05 }}
                            className="h-full rounded-full bg-gradient-to-r from-[#A8D5BA] to-[#6CC89A] group-hover:from-[#6CC89A] group-hover:to-[#2E7D52] transition-all"
                        />
                    </div>
                </motion.div>
            ))}
        </div>
    );
}

function RecentWinsFeed({ wins }: { wins: any[] }) {
    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => {
        if (wins && wins.length > 0) {
            const interval = setInterval(() => {
                setCurrentIndex((prev) => (prev + 1) % wins.length);
            }, 4000);
            return () => clearInterval(interval);
        }
    }, [wins]);

    if (!wins || wins.length === 0) {
        return (
            <div className="space-y-3">
                {[1, 2, 3].map(i => (
                    <div key={i} className="animate-pulse bg-slate-100 rounded-2xl p-4 h-20" />
                ))}
            </div>
        );
    }

    return (
        <div className="space-y-3 min-h-[240px]">
            <AnimatePresence mode="wait">
                {wins.slice(currentIndex, currentIndex + 3).map((win, i) => (
                    <motion.div
                        key={`${win.username}-${win.timestamp}`}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.4, delay: i * 0.1 }}
                        className="bg-white border border-black/5 rounded-2xl p-4 shadow-sm hover:shadow-lg transition-all flex items-start gap-3"
                    >
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-xl"
                            style={{ backgroundColor: win.type === 'achievement' ? '#C3B1E1' : '#A8D5BA' }}>
                            {win.type === 'achievement' ? '🏆' : '⚔️'}
                        </div>
                        <div className="flex-1 min-w-0">
                            {win.type === 'achievement' ? (
                                <>
                                    <p className="text-sm font-black text-[#1A1A2E] truncate">
                                        <span style={{ color: win.color || C.sage }}>{win.username}</span> unlocked
                                    </p>
                                    <p className="text-xs font-bold text-slate-400">"{win.achievement}"</p>
                                </>
                            ) : (
                                <>
                                    <p className="text-sm font-black text-[#1A1A2E] truncate">
                                        <span style={{ color: win.color || C.sage }}>{win.username}</span>
                                    </p>
                                    <p className="text-xs font-bold text-slate-400">
                                        {win.hexesInvaded > 0 ? `Invaded ${win.hexesInvaded} hexes` : `Captured ${win.hexesCaptured} hexes`} • {win.creditsEarned} credits
                                    </p>
                                </>
                            )}
                        </div>
                        <span className="text-[8px] font-black uppercase tracking-widest text-slate-300 whitespace-nowrap">Just Now</span>
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    );
}

// --- MAIN PAGE ---

export default function LandingPage() {
    // Configure fetcher with 5-second timeout for landing page performance
    const fetcherWithTimeout = (url: string) => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        return api.get(url, { signal: controller.signal })
            .then(res => {
                clearTimeout(timeoutId);
                return res.data;
            })
            .catch(err => {
                clearTimeout(timeoutId);
                // Return fallback data on timeout instead of throwing
                if (err.code === 'ECONNABORTED' || err.signal?.aborted) {
                    console.warn(`Request timeout for ${url}, using fallback data`);
                    return getFallbackData(url);
                }
                throw err;
            });
    };

    const { data: enhancedStats } = useSWR('/leaderboard/enhanced-stats', fetcherWithTimeout, { 
        refreshInterval: 120000, // 2 min
        dedupingInterval: 60000,
        focusThrottleInterval: 300000,
        errorRetryCount: 2,
        errorRetryInterval: 3000,
    });
    const { data: commandersData } = useSWR('/leaderboard/top-commanders?limit=3', fetcherWithTimeout, { 
        refreshInterval: 300000, // 5 min
        dedupingInterval: 120000,
        errorRetryCount: 1,
    });
    const { data: cityActivityData } = useSWR('/leaderboard/city-activity', fetcherWithTimeout, { 
        refreshInterval: 300000, // 5 min
        dedupingInterval: 120000,
        errorRetryCount: 1,
    });
    const { data: recentWinsData } = useSWR('/leaderboard/recent-wins?limit=9', fetcherWithTimeout, { 
        refreshInterval: 60000, // 1 min
        dedupingInterval: 30000,
        errorRetryCount: 1,
    });
    const { data: invasionData } = useSWR('/map/invasions?limit=5', fetcherWithTimeout, { 
        refreshInterval: 15000,
        dedupingInterval: 5000,
        errorRetryCount: 1,
    });

    const [feedIndex, setFeedIndex] = useState(0);

    const invasions = invasionData?.invasions || [];
    const commanders = commandersData?.commanders || [];
    const cities = cityActivityData?.cities || [];
    const wins = recentWinsData?.wins || [];
    const onlineCount = enhancedStats?.onlineCount || 0;

    useEffect(() => {
        if (invasions.length > 0) {
            const interval = setInterval(() => {
                setFeedIndex((prev) => (prev + 1) % invasions.length);
            }, 3500);
            return () => clearInterval(interval);
        }
    }, [invasions.length]);

    const activeActivity = invasions[feedIndex] || {
        invaderUsername: 'System',
        action: 'monitoring',
        hexCity: 'The Grid',
        occurredAt: new Date()
    };

    return (
        <div className="min-h-screen bg-[#F4F7F4] font-['Nunito'] text-[#1A1A2E] overflow-x-hidden selection:bg-[#A8D5BA]/30">

            {/* ─── NAVIGATION ─── */}
            <nav className="fixed top-0 left-0 right-0 z-[100] h-16 sm:h-20 md:h-24 px-4 sm:px-6 md:px-12 flex items-center justify-between pointer-events-none">
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-2 sm:gap-3 md:gap-4 bg-white/90 backdrop-blur-2xl px-4 sm:px-5 md:px-6 py-2 sm:py-3 rounded-lg sm:rounded-xl md:rounded-2xl border border-white shadow-lg sm:shadow-xl shadow-green-900/5 pointer-events-auto"
                >
                    <div className="w-8 sm:w-9 md:w-10 h-8 sm:h-9 md:h-10 rounded-lg sm:rounded-[8px] md:rounded-xl bg-gradient-to-br from-[#A8D5BA] to-[#6CC89A] flex items-center justify-center text-white shadow-lg shadow-green-200">
                        <Hexagon size={18} className="sm:w-5 sm:h-5 md:w-6 md:h-6" fill="currentColor" fillOpacity={0.2} />
                    </div>
                    <span className="font-['Syne'] font-extrabold text-sm sm:text-base md:text-xl tracking-tighter hidden sm:inline">Territory<span className="text-[#A8D5BA]">Run</span></span>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-2 sm:gap-3 md:gap-4 pointer-events-auto">
                    <Link href="/login" className="hidden md:flex bg-white/90 backdrop-blur-xl border border-black/5 text-[9px] sm:text-[10px] md:text-[11px] font-black uppercase tracking-widest text-slate-500 hover:text-[#A8D5BA] hover:shadow-md transition-all px-4 sm:px-6 md:px-8 py-2 sm:py-3 md:py-4 rounded-lg sm:rounded-xl md:rounded-2xl">
                        Log In
                    </Link>
                    <Link href="/login" className="bg-[#1A1A2E] text-white text-[9px] sm:text-[10px] md:text-[11px] font-black uppercase tracking-widest px-4 sm:px-6 md:px-8 py-2 sm:py-3 md:py-4 rounded-lg sm:rounded-xl md:rounded-2xl shadow-2xl shadow-slate-900/20 hover:scale-105 active:scale-95 transition-all">
                        Launch
                    </Link>
                </motion.div>
            </nav>

            {/* ─── HERO SECTION ─── */}
            <section className="relative pt-20 sm:pt-32 md:pt-48 pb-12 sm:pb-16 md:pb-24 px-4 sm:px-6 md:px-12 min-h-screen flex flex-col items-center justify-center overflow-hidden">
                <DecorativeHexGrid />

                {/* Floating Soft Orbs */}
                <div className="absolute top-1/4 -right-20 w-[600px] h-[600px] bg-[#A8D5BA]/10 rounded-full blur-[120px] pointer-events-none animate-pulse" />
                <div className="absolute bottom-1/4 -left-20 w-[500px] h-[500px] bg-[#C3B1E1]/10 rounded-full blur-[100px] pointer-events-none" />

                <div className="max-w-7xl mx-auto flex flex-col items-center text-center relative z-10 w-full">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.6 }}
                        className="inline-flex items-center gap-2 sm:gap-3 bg-white/80 backdrop-blur-md border border-[#A8D5BA]/30 px-3 sm:px-6 py-1.5 sm:py-2 rounded-full mb-6 sm:mb-8 md:mb-12 shadow-sm"
                    >
                        <div className="flex h-1.5 w-1.5 sm:h-2.5 sm:w-2.5 rounded-full bg-[#A8D5BA] shadow-[0_0_10px_#A8D5BA]" />
                        <span className="text-[9px] sm:text-[10px] md:text-[11px] font-black uppercase tracking-[0.2em] text-[#2E7D52]">
                            {onlineCount > 0 ? `${onlineCount.toLocaleString()} Claiming Territory Now` : 'S04 ACTIVE'}
                        </span>
                    </motion.div>

                    <motion.h1
                        initial={{ opacity: 0, y: 40 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.1 }}
                        className="font-['Syne'] font-extrabold text-[clamp(32px,8vw,120px)] leading-[0.9] tracking-tighter mb-6 sm:mb-10 md:mb-12">
                        CLAIM YOUR <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#A8D5BA] via-[#6CC89A] to-[#C3B1E1] filter drop-shadow-sm">STREETS.</span>
                    </motion.h1>

                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                        className="text-sm sm:text-lg md:text-2xl text-slate-400 font-bold max-w-3xl mx-auto mb-8 sm:mb-10 md:mb-14 leading-relaxed tracking-tight px-4"
                    >
                        Step into global territory control. Every kilometre expands your empire.
                    </motion.p>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.3 }}
                        className="flex flex-col w-full sm:flex-row gap-4 sm:gap-6 justify-center items-center"
                    >
                        <Link href="/login" className="w-full sm:w-auto px-6 sm:px-12 py-4 sm:py-6 bg-gradient-to-r from-[#A8D5BA] to-[#6CC89A] text-white rounded-[24px] sm:rounded-[32px] shadow-[0_20px_40px_-10px_rgba(168,213,186,0.5)] font-black uppercase text-[10px] sm:text-xs tracking-[0.2em] hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2 sm:gap-4 group">
                            Start Run
                            <ArrowRight size={16} className="sm:w-5 sm:h-5 group-hover:translate-x-1 transition-transform" />
                        </Link>
                        <Link href="/community" className="w-full sm:w-auto px-6 sm:px-12 py-4 sm:py-6 bg-white border border-black/5 rounded-[24px] sm:rounded-[32px] shadow-xl shadow-slate-900/5 text-[#1A1A2E] font-black uppercase text-[10px] sm:text-xs tracking-[0.2em] hover:bg-white transition-all flex items-center justify-center gap-2 sm:gap-4 group">
                            <Play size={16} className="sm:w-5 sm:h-5 fill-[#A8D5BA] text-[#A8D5BA] group-hover:scale-110 transition-transform" />
                            Brief
                        </Link>
                    </motion.div>
                </div>

                {/* --- LIVE ACTIVITY BUBBLE --- */}
                <motion.div
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1, duration: 0.6 }}
                    className="mt-12 sm:mt-16 md:mt-28 lg:mt-32 w-full max-w-lg px-4 sm:px-0"
                >
                    <div className="bg-white/80 backdrop-blur-2xl px-4 sm:px-6 md:px-8 py-4 sm:py-5 rounded-[28px] sm:rounded-[40px] border border-white shadow-2xl shadow-green-900/5 flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-6 group hover:translate-y-[-4px] transition-transform">
                        <div className="w-12 sm:w-14 md:w-16 h-12 sm:h-14 md:h-16 rounded-lg sm:rounded-2xl bg-[#A8D5BA] flex items-center justify-center text-white shadow-[0_12px_24px_-8px_#A8D5BA] shrink-0">
                            <Zap size={24} className="sm:w-7 sm:h-7 md:w-8 md:h-8" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={feedIndex}
                                    initial={{ opacity: 0, x: 15 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -15 }}
                                    className="space-y-1"
                                >
                                    <p className="text-sm sm:text-base font-black text-[#1A1A2E] truncate">
                                        {activeActivity.invaderUsername} <span className="text-slate-300 font-bold uppercase text-[8px] sm:text-[10px] tracking-widest pl-1">just took</span>
                                    </p>
                                    <div className="flex items-center gap-2 sm:gap-3">
                                        <div className="bg-[#F0F7F4] px-2 sm:px-3 py-0.5 sm:py-1 rounded-lg">
                                            <span className="text-[9px] sm:text-[11px] font-black uppercase tracking-widest text-[#2E7D52] truncate">{activeActivity.hexCity || 'Unknown'}</span>
                                        </div>
                                        <div className="flex items-center gap-1 whitespace-nowrap">
                                            <Radio size={10} className="sm:w-3 sm:h-3 text-[#A8D5BA] animate-pulse" />
                                            <span className="text-[8px] sm:text-[10px] font-black text-slate-300 uppercase tracking-widest">Live</span>
                                        </div>
                                    </div>
                                </motion.div>
                            </AnimatePresence>
                        </div>
                    </div>
                </motion.div>
            </section>

            <StatTicker stats={enhancedStats} />

            {/* ─── TOP COMMANDERS & LIVE ACTIVITY ─── */}
            <section className="py-16 sm:py-24 md:py-32 px-4 sm:px-6 md:px-12 bg-[#F4F7F4] relative">
                <div className="max-w-7xl mx-auto">
                    {/* Top Commanders Podium */}
                    <div className="mb-20">
                        <div className="text-center mb-12">
                            <div className="flex items-center justify-center gap-3 mb-6">
                                <span className="text-[9px] sm:text-[10px] md:text-[11px] font-black uppercase tracking-[0.3em] text-[#A8D5BA]">Elite Commanders</span>
                                <div className="h-0.5 w-12 bg-[#A8D5BA]/30" />
                            </div>
                            <h2 className="font-['Syne'] font-extrabold text-3xl sm:text-5xl md:text-6xl tracking-tighter text-[#1A1A2E] leading-none">
                                TOP RUNNERS <span className="text-[#A8D5BA]">RIGHT NOW</span>
                            </h2>
                        </div>
                        <TopCommandersPodium commanders={commanders} />
                    </div>

                    {/* Live Activity Grid */}
                    <div className="grid md:grid-cols-2 gap-8 md:gap-12">
                        {/* City Activity Heatmap */}
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            className="bg-white border border-black/5 rounded-[32px] p-8 shadow-lg"
                        >
                            <div className="flex items-center gap-3 mb-8">
                                <div className="w-12 h-12 rounded-xl bg-[#A8D5BA]/10 flex items-center justify-center">
                                    <Globe size={24} className="text-[#A8D5BA]" />
                                </div>
                                <div>
                                    <h3 className="font-['Syne'] font-extrabold text-xl text-[#1A1A2E]">Hottest Cities</h3>
                                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Last Hour</p>
                                </div>
                            </div>
                            <LiveCityHeatmap cities={cities} />
                        </motion.div>

                        {/* Recent Wins Feed */}
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.2 }}
                            className="bg-white border border-black/5 rounded-[32px] p-8 shadow-lg"
                        >
                            <div className="flex items-center gap-3 mb-8">
                                <div className="w-12 h-12 rounded-xl bg-[#C3B1E1]/10 flex items-center justify-center">
                                    <Sparkles size={24} className="text-[#C3B1E1]" />
                                </div>
                                <div>
                                    <h3 className="font-['Syne'] font-extrabold text-xl text-[#1A1A2E]">Recent Wins</h3>
                                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Live Feed</p>
                                </div>
                            </div>
                            <RecentWinsFeed wins={wins} />
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* ─── FEATURES GRID ─── */}
            <section className="py-16 sm:py-24 md:py-40 px-4 sm:px-6 md:px-12 bg-white relative">
                <div className="max-w-7xl mx-auto">
                    <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 sm:mb-16 md:mb-24 gap-6 sm:gap-8 md:gap-12">
                        <div className="max-w-2xl">
                            <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
                                <span className="text-[9px] sm:text-[10px] md:text-[11px] font-black uppercase tracking-[0.3em] text-[#A8D5BA]">The Protocol</span>
                                <div className="h-0.5 w-8 sm:w-12 bg-[#A8D5BA]/30" />
                            </div>
                            <h2 className="font-['Syne'] font-extrabold text-3xl sm:text-5xl md:text-7xl lg:text-8xl tracking-tighter text-[#1A1A2E] leading-none">
                                RUNNING IS YOUR <br /> <span className="text-[#A8D5BA]">STRATEGY.</span>
                            </h2>
                        </div>
                        <p className="max-w-md text-slate-400 font-bold text-sm sm:text-lg md:text-xl leading-relaxed tracking-tight">
                            Every step validates your claim to the city.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
                        <FeatureCard
                            icon={MapIcon}
                            title="Global Hex Grid"
                            desc="Utilizing Uber's H3 resolution 9, we've divided the entire planet into captureable zones. No corner is safe."
                            color="#A8D5BA"
                            delay={0}
                        />
                        <FeatureCard
                            icon={Zap}
                            title="Signal Warnings"
                            desc="Real-time alerts when a rival runner breaches your perimeter. Immediate response protocol recommended."
                            color="#F4B8C1"
                            delay={0.1}
                        />
                        <FeatureCard
                            icon={Target}
                            title="Vector Linking"
                            desc="Connect adjacent hexes to establish massive sectors for exponential credit generation and influence."
                            color="#C3B1E1"
                            delay={0.2}
                        />
                        <FeatureCard
                            icon={BarChart3}
                            title="Tactical Ranking"
                            desc="Climb from Field Runner to Grand Marshal. Ranks are strictly performance-based and verifiable."
                            color="#FFD6A5"
                            delay={0.3}
                        />
                        <FeatureCard
                            icon={Shield}
                            title="On-Chain Assets"
                            desc="Provenance of every territory is cryptographically secured. Your legend is permanent on the blockchain."
                            color="#B5D5F5"
                            delay={0.4}
                        />
                        <FeatureCard
                            icon={Users}
                            title="Coalitions"
                            desc="Form tactical units with friends. Control entire municipalities and share the strategic rewards."
                            color="#6CC89A"
                            delay={0.5}
                        />
                    </div>
                </div>
            </section>

            {/* ─── CALL TO ACTION ─── */}
            <section className="py-16 sm:py-24 md:py-32 px-4 sm:px-6 md:px-12 relative overflow-hidden">
                <div className="absolute inset-0 bg-white" />
                <div className="max-w-7xl mx-auto relative z-10">
                    <div className="bg-[#1A1A2E] rounded-[48px] sm:rounded-[64px] md:rounded-[80px] p-8 sm:p-16 md:p-32 text-center relative overflow-hidden shadow-2xl flex flex-col items-center">
                        {/* Decorative background for CTA */}
                        <div className="absolute top-0 left-0 w-full h-full opacity-5 pointer-events-none">
                            <Hexagon size={300} className="sm:w-[400px] sm:h-[400px] md:w-[500px] md:h-[500px] absolute -top-20 -right-20 rotate-12" />
                            <Hexagon size={200} className="sm:w-[300px] sm:h-[300px] absolute -bottom-20 -left-20 -rotate-12" />
                        </div>

                        <motion.div
                            whileInView={{ scale: [0.9, 1], opacity: [0, 1] }}
                            viewport={{ once: true }}
                            className="w-16 sm:w-20 md:w-24 h-16 sm:h-20 md:h-24 rounded-[20px] sm:rounded-[28px] md:rounded-[32px] bg-white/5 backdrop-blur-xl flex items-center justify-center text-[#A8D5BA] mb-6 sm:mb-10 md:mb-12 border border-white/10 shadow-inner"
                        >
                            <Sparkles size={32} className="sm:w-10 sm:h-10 md:w-12 md:h-12" strokeWidth={1.5} />
                        </motion.div>

                        <h2 className="font-['Syne'] font-extrabold text-3xl sm:text-5xl md:text-8xl text-white tracking-tighter mb-6 sm:mb-8 md:mb-10 max-w-4xl mx-auto leading-none italic">
                            THE CITY AWAITS <br /> YOUR COMMAND.
                        </h2>

                        <p className="text-white/40 font-bold text-sm sm:text-lg md:text-xl mb-8 sm:mb-12 md:mb-16 max-w-2xl mx-auto leading-relaxed">
                            Join {enhancedStats?.totalUsers ? enhancedStats.totalUsers.toLocaleString() : '48,000'} runners who have claimed their first hex.
                            {enhancedStats?.weeklyGrowth > 0 && (
                                <span className="block mt-2 text-[#A8D5BA] font-black text-sm">
                                    +{enhancedStats.weeklyGrowth.toLocaleString()} joined this week
                                </span>
                            )}
                        </p>

                        <Link href="/login" className="px-8 sm:px-12 md:px-16 py-4 sm:py-6 md:py-8 bg-[#A8D5BA] text-white rounded-[24px] sm:rounded-[32px] font-black uppercase text-[10px] sm:text-xs md:text-[11px] tracking-[0.3em] shadow-[0_25px_50px_-12px_rgba(168,213,186,0.5)] hover:bg-[#6CC89A] hover:scale-105 active:scale-95 transition-all">
                            Initialize Deployment
                        </Link>
                    </div>
                </div>
            </section>

            {/* ─── FOOTER ─── */}
            <footer className="py-24 px-6 md:px-12 border-t border-black/5 bg-white relative z-10">
                <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-20">
                    <div className="space-y-10">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-[#A8D5BA] flex items-center justify-center text-white shadow-lg shadow-green-100">
                                <Hexagon size={24} fill="currentColor" fillOpacity={0.2} />
                            </div>
                            <span className="font-['Syne'] font-extrabold text-2xl tracking-tighter">TerritoryRun</span>
                        </div>
                        <p className="text-slate-400 font-bold max-w-sm text-lg leading-relaxed">
                            The definitive real-world territory strategy engine. Powered by cardio, secured by the chain.
                        </p>
                        <div className="flex items-center gap-4">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">Operational In</span>
                            <div className="flex gap-2">
                                {['MUM', 'BLR', 'DEL', 'HYD', 'PNQ'].map(city => (
                                    <span key={city} className="px-2 py-1 bg-slate-50 border border-black/5 rounded text-[9px] font-black text-slate-400">{city}</span>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-12">
                        <FooterCol title="Network" links={[
                            { label: 'Strategic Map', href: '/map' },
                            { label: 'Global Ranks', href: '/leaderboard' },
                            { label: 'Economic Data', href: '/dashboard' },
                            { label: 'API Docs', href: '#' }
                        ]} />
                        <FooterCol title="Protocol" links={[
                            { label: 'Security', href: '#' },
                            { label: 'Whitepaper', href: '#' },
                            { label: 'Governance', href: '#' },
                            { label: 'Privacy', href: '#' }
                        ]} />
                        <FooterCol title="Social" links={[
                            { label: 'Discord', href: '#', external: true },
                            { label: 'X / Twitter', href: '#', external: true },
                            { label: 'Instagram', href: 'https://www.instagram.com/start.up_hub?igsh=eWVtOW85YjRtMzA0', external: true }
                        ]} />
                    </div>
                </div>
                <div className="max-w-7xl mx-auto mt-24 pt-12 border-t border-black/5 flex flex-col md:flex-row justify-between items-center gap-8">
                    <div className="text-slate-300 text-[10px] font-black uppercase tracking-[0.4em]">
                        © 2026 TerritoryRun Studios • All Rights Reserved
                    </div>
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2">
                            <div className="h-1.5 w-1.5 rounded-full bg-[#A8D5BA] animate-pulse" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-[#A8D5BA]">Uplink Stable</span>
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">V0.9.4-S4</span>
                    </div>
                </div>
            </footer>
        </div>
    );
}

// Fallback data returned on timeout to prevent infinite skeleton screens
function getFallbackData(url: string) {
    if (url.includes('/leaderboard/enhanced-stats')) {
        return {
            totalUsers: 50,
            totalHexes: 2500,
            totalCredits: 250000,
            activeSorties: 15,
            onlineCount: 8,
            distanceToday: 45.2,
            distanceWeek: 280.5,
            territoriesInvadedToday: 5,
            weeklyGrowth: 3,
        };
    }
    if (url.includes('/leaderboard/top-commanders')) {
        return {
            commanders: [
                { rank: 1, username: 'Commander_01', credits: 50000, hexesOwned: 500, color: '#A8D5BA', currentStreak: 12 },
                { rank: 2, username: 'Runner_Elite', credits: 45000, hexesOwned: 480, color: '#FFD6A5', currentStreak: 8 },
                { rank: 3, username: 'TerritoryKing', credits: 40000, hexesOwned: 450, color: '#F4B8C1', currentStreak: 5 },
            ]
        };
    }
    if (url.includes('/leaderboard/city-activity')) {
        return {
            cities: [
                { city: 'Mumbai', hexesCaptured: 450, runCount: 120, totalCredits: 58000 },
                { city: 'Bangalore', hexesCaptured: 380, runCount: 95, totalCredits: 48000 },
                { city: 'Delhi', hexesCaptured: 320, runCount: 82, totalCredits: 42000 },
                { city: 'Pune', hexesCaptured: 250, runCount: 65, totalCredits: 35000 },
                { city: 'Hyderabad', hexesCaptured: 200, runCount: 48, totalCredits: 28000 },
            ]
        };
    }
    if (url.includes('/leaderboard/recent-wins')) {
        return {
            wins: [
                { type: 'achievement', username: 'SpeedDemon', achievement: 'Sprint Master', tier: 'gold', timestamp: new Date() },
                { type: 'run', username: 'MapMaster', creditsEarned: 750, hexesCaptured: 45, hexesInvaded: 8, timestamp: new Date() },
                { type: 'achievement', username: 'HexLord', achievement: 'Territory Tycoon', tier: 'diamond', timestamp: new Date() },
            ]
        };
    }
    if (url.includes('/map/invasions')) {
        return {
            invasions: [
                { _id: '1', invaderUsername: 'Runner_01', victimUsername: 'Player_02', hexCity: 'Mumbai', occurredAt: new Date() },
                { _id: '2', invaderUsername: 'Elite_Runner', victimUsername: 'Casual_01', hexCity: 'Bangalore', occurredAt: new Date() },
                { _id: '3', invaderUsername: 'TerritoryKing', victimUsername: 'NewbieRunner', hexCity: 'Delhi', occurredAt: new Date() },
            ]
        };
    }
    return null;
}

function FooterCol({ title, links }: any) {
    return (
        <div className="space-y-8">
            <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-[#A8D5BA]">{title}</h4>
            <div className="flex flex-col gap-5">
                {links.map((link: any) => {
                    const label = typeof link === 'string' ? link : link.label;
                    const href = typeof link === 'string' ? '#' : (link.href || '#');
                    const isExternal = typeof link === 'object' && link.external;
                    
                    // Use regular <a> tag for external links, Link for internal routes
                    if (isExternal) {
                        return (
                            <a 
                                key={label}
                                href={href}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm font-bold text-[#1A1A2E] hover:text-[#A8D5BA] transition-colors cursor-pointer"
                            >
                                {label}
                            </a>
                        );
                    }
                    
                    return (
                        <Link 
                            key={label} 
                            href={href}
                            className="text-sm font-bold text-[#1A1A2E] hover:text-[#A8D5BA] transition-colors"
                        >
                            {label}
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}
