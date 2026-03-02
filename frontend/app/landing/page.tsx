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
    const items = [
        { label: 'Territories Claimed', value: stats?.totalHexes?.toLocaleString() || '482,901', color: C.sage },
        { label: 'Active Runners', value: stats?.onlineCount?.toLocaleString() || '1,204', color: C.sageDark },
        { label: 'Total Players', value: stats?.totalUsers?.toLocaleString() || '48,200', color: C.sky },
        { label: 'Credits Earned', value: stats?.totalCredits > 1000000 ? `${(stats.totalCredits / 1000000).toFixed(1)}M` : stats?.totalCredits?.toLocaleString() || '9.4M', color: C.lavender },
        { label: '24h Invasions', value: stats?.activeSorties?.toLocaleString() || '38,290', color: C.rose },
    ];

    const scrollItems = [...items, ...items, ...items];

    return (
        <div className="py-6 bg-white/80 backdrop-blur-md border-y border-black/5 overflow-hidden whitespace-nowrap relative z-10">
            <motion.div
                className="flex gap-20 items-center"
                animate={{ x: [0, -1000] }}
                transition={{ duration: 35, repeat: Infinity, ease: "linear" }}
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
            className="p-10 bg-white border border-black/5 rounded-[48px] shadow-sm hover:shadow-2xl hover:shadow-green-100/50 transition-all group relative overflow-hidden"
        >
            <div className={`absolute top-0 right-0 w-32 h-32 opacity-5 rounded-bl-[100px] transition-transform group-hover:scale-110`} style={{ backgroundColor: color }} />
            <div
                className="w-16 h-16 rounded-3xl flex items-center justify-center mb-8 shadow-lg transition-transform group-hover:rotate-6 group-hover:scale-110 border-2 border-white"
                style={{ backgroundColor: `${color}15`, color: color }}
            >
                <Icon size={32} strokeWidth={2.5} />
            </div>
            <h3 className="font-['Syne'] font-extrabold text-2xl mb-4 text-[#1A1A2E] tracking-tight">{title}</h3>
            <p className="text-slate-400 font-bold text-sm leading-relaxed">{desc}</p>
        </motion.div>
    );
}

// --- MAIN PAGE ---

export default function LandingPage() {
    const { data: globalStats } = useSWR('/leaderboard/stats', fetcher, { refreshInterval: 60000 });
    const { data: onlineData } = useSWR('/user/online', fetcher, { refreshInterval: 30000 });
    const { data: invasionData } = useSWR('/map/invasions?limit=5', fetcher, { refreshInterval: 15000 });

    const [feedIndex, setFeedIndex] = useState(0);

    const invasions = invasionData?.invasions || [];
    const onlineCount = onlineData?.count || globalStats?.onlineCount || 0;

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
            <nav className="fixed top-0 left-0 right-0 z-[100] h-24 px-6 md:px-12 flex items-center justify-between pointer-events-none">
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-4 bg-white/90 backdrop-blur-2xl px-6 py-3 rounded-2xl border border-white shadow-xl shadow-green-900/5 pointer-events-auto"
                >
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#A8D5BA] to-[#6CC89A] flex items-center justify-center text-white shadow-lg shadow-green-200">
                        <Hexagon size={22} fill="currentColor" fillOpacity={0.2} />
                    </div>
                    <span className="font-['Syne'] font-extrabold text-xl tracking-tighter">Territory<span className="text-[#A8D5BA]">Run</span></span>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-4 pointer-events-auto"
                >
                    <Link href="/login" className="hidden md:flex bg-white/90 backdrop-blur-xl border border-black/5 text-[11px] font-black uppercase tracking-widest text-slate-500 hover:text-[#A8D5BA] hover:shadow-md transition-all px-8 py-4 rounded-2xl">
                        Log In
                    </Link>
                    <Link href="/login" className="bg-[#1A1A2E] text-white text-[11px] font-black uppercase tracking-widest px-8 py-4 rounded-2xl shadow-2xl shadow-slate-900/20 hover:scale-105 active:scale-95 transition-all">
                        Launch Deployment
                    </Link>
                </motion.div>
            </nav>

            {/* ─── HERO SECTION ─── */}
            <section className="relative pt-48 pb-24 px-6 md:px-12 min-h-screen flex flex-col items-center justify-center overflow-hidden">
                <DecorativeHexGrid />

                {/* Floating Soft Orbs */}
                <div className="absolute top-1/4 -right-20 w-[600px] h-[600px] bg-[#A8D5BA]/10 rounded-full blur-[120px] pointer-events-none animate-pulse" />
                <div className="absolute bottom-1/4 -left-20 w-[500px] h-[500px] bg-[#C3B1E1]/10 rounded-full blur-[100px] pointer-events-none" />

                <div className="max-w-7xl mx-auto flex flex-col items-center text-center relative z-10 w-full">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.6 }}
                        className="inline-flex items-center gap-3 bg-white/80 backdrop-blur-md border border-[#A8D5BA]/30 px-6 py-2 rounded-full mb-12 shadow-sm"
                    >
                        <div className="flex h-2.5 w-2.5 rounded-full bg-[#A8D5BA] shadow-[0_0_10px_#A8D5BA]" />
                        <span className="text-[11px] font-black uppercase tracking-[0.2em] text-[#2E7D52]">
                            {onlineCount.toLocaleString()} Tactical Units Online • Season 04 ACTIVE
                        </span>
                    </motion.div>

                    <motion.h1
                        initial={{ opacity: 0, y: 40 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.1 }}
                        className="font-['Syne'] font-extrabold text-[clamp(44px,10vw,120px)] leading-[0.9] tracking-tighter mb-12"
                    >
                        CLAIM YOUR <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#A8D5BA] via-[#6CC89A] to-[#C3B1E1] filter drop-shadow-sm">STREETS.</span>
                    </motion.h1>

                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                        className="text-lg md:text-2xl text-slate-400 font-bold max-w-3xl mx-auto mb-14 leading-relaxed tracking-tight"
                    >
                        Step into a global game of real-world territory control. Every kilometre expands your empire. Defend your turf or watch it fall.
                    </motion.p>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.3 }}
                        className="flex flex-col sm:flex-row gap-6 justify-center items-center w-full"
                    >
                        <Link href="/login" className="w-full sm:w-auto px-12 py-6 bg-gradient-to-r from-[#A8D5BA] to-[#6CC89A] text-white rounded-[32px] shadow-[0_20px_40px_-10px_rgba(168,213,186,0.5)] font-black uppercase text-xs tracking-[0.2em] hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-4 group">
                            Start Your Run
                            <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                        </Link>
                        <button className="w-full sm:w-auto px-12 py-6 bg-white border border-black/5 rounded-[32px] shadow-xl shadow-slate-900/5 text-[#1A1A2E] font-black uppercase text-xs tracking-[0.2em] hover:bg-white transition-all flex items-center justify-center gap-4 group">
                            <Play size={20} fill="currentColor" className="text-[#A8D5BA] group-hover:scale-110 transition-transform" />
                            Tactical Brief
                        </button>
                    </motion.div>
                </div>

                {/* --- LIVE ACTIVITY BUBBLE --- */}
                <motion.div
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1, duration: 0.6 }}
                    className="mt-28 md:mt-32 w-full max-w-lg"
                >
                    <div className="bg-white/80 backdrop-blur-2xl px-8 py-5 rounded-[40px] border border-white shadow-2xl shadow-green-900/5 flex items-center gap-6 group hover:translate-y-[-4px] transition-transform">
                        <div className="w-16 h-16 rounded-2xl bg-[#A8D5BA] flex items-center justify-center text-white shadow-[0_12px_24px_-8px_#A8D5BA] shrink-0">
                            <Zap size={32} />
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
                                    <p className="text-base font-black text-[#1A1A2E] truncate">
                                        {activeActivity.invaderUsername} <span className="text-slate-300 font-bold uppercase text-[10px] tracking-widest pl-1">just took control of</span>
                                    </p>
                                    <div className="flex items-center gap-3">
                                        <div className="bg-[#F0F7F4] px-3 py-1 rounded-lg">
                                            <span className="text-[11px] font-black uppercase tracking-widest text-[#2E7D52]">{activeActivity.hexCity || 'Unknown Sector'}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <Radio size={12} className="text-[#A8D5BA] animate-pulse" />
                                            <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Live SAT-LINK</span>
                                        </div>
                                    </div>
                                </motion.div>
                            </AnimatePresence>
                        </div>
                    </div>
                </motion.div>
            </section>

            <StatTicker stats={{ ...globalStats, onlineCount }} />

            {/* ─── FEATURES GRID ─── */}
            <section className="py-40 px-6 md:px-12 bg-white relative">
                <div className="max-w-7xl mx-auto">
                    <div className="flex flex-col md:flex-row md:items-end justify-between mb-24 gap-12">
                        <div className="max-w-2xl">
                            <div className="flex items-center gap-3 mb-6">
                                <span className="text-[11px] font-black uppercase tracking-[0.3em] text-[#A8D5BA]">The Protocol</span>
                                <div className="h-0.5 w-12 bg-[#A8D5BA]/30" />
                            </div>
                            <h2 className="font-['Syne'] font-extrabold text-5xl md:text-7xl lg:text-8xl tracking-tighter text-[#1A1A2E] leading-none">
                                RUNNING IS YOUR <br /> <span className="text-[#A8D5BA]">STRATEGY.</span>
                            </h2>
                        </div>
                        <p className="max-w-md text-slate-400 font-bold text-xl leading-relaxed tracking-tight">
                            We've turned your fitness into a tactical landscape. Every step validates your claim to the city.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
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
            <section className="py-32 px-6 md:px-12 relative overflow-hidden">
                <div className="absolute inset-0 bg-white" />
                <div className="max-w-7xl mx-auto relative z-10">
                    <div className="bg-[#1A1A2E] rounded-[80px] p-16 md:p-32 text-center relative overflow-hidden shadow-2xl flex flex-col items-center">
                        {/* Decorative background for CTA */}
                        <div className="absolute top-0 left-0 w-full h-full opacity-5 pointer-events-none">
                            <Hexagon size={400} className="absolute -top-20 -right-20 rotate-12" />
                            <Hexagon size={300} className="absolute -bottom-20 -left-20 -rotate-12" />
                        </div>

                        <motion.div
                            whileInView={{ scale: [0.9, 1], opacity: [0, 1] }}
                            viewport={{ once: true }}
                            className="w-24 h-24 rounded-[32px] bg-white/5 backdrop-blur-xl flex items-center justify-center text-[#A8D5BA] mb-12 border border-white/10 shadow-inner"
                        >
                            <Sparkles size={48} strokeWidth={1.5} />
                        </motion.div>

                        <h2 className="font-['Syne'] font-extrabold text-5xl md:text-8xl text-white tracking-tighter mb-10 max-w-4xl mx-auto leading-none italic">
                            THE CITY AWAITS <br /> YOUR COMMAND.
                        </h2>

                        <p className="text-white/40 font-bold text-xl mb-16 max-w-2xl mx-auto leading-relaxed">
                            Join over {globalStats?.totalUsers?.toLocaleString() || '48,000'} runners who have already claimed their first hex. The grid resets for no one.
                        </p>

                        <Link href="/login" className="px-16 py-8 bg-[#A8D5BA] text-white rounded-[32px] font-black uppercase text-xs tracking-[0.3em] shadow-[0_25px_50px_-12px_rgba(168,213,186,0.5)] hover:bg-[#6CC89A] hover:scale-105 active:scale-95 transition-all">
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
                        <FooterCol title="Network" links={['Strategic Map', 'Global Ranks', 'Economic Data', 'API Docs']} />
                        <FooterCol title="Protocol" links={['Security', 'Whitepaper', 'Governance', 'Privacy']} />
                        <FooterCol title="Social" links={['Discord', 'X / Twitter', 'Instagram']} />
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

function FooterCol({ title, links }: any) {
    return (
        <div className="space-y-8">
            <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-[#A8D5BA]">{title}</h4>
            <div className="flex flex-col gap-5">
                {links.map((l: string) => (
                    <Link key={l} href="#" className="text-sm font-bold text-[#1A1A2E] hover:text-[#A8D5BA] transition-colors">{l}</Link>
                ))}
            </div>
        </div>
    );
}
