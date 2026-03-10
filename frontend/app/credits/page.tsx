'use client';

import React from 'react';
import useSWR from 'swr';
import { motion } from 'framer-motion';
import {
    TrendingUp,
    TrendingDown,
    HelpCircle,
    ArrowLeft,
    Zap,
    Shield,
    Coins,
    ChevronRight,
    History,
    Bot,
    Clock,
    ShieldAlert,
    Activity,
    Wallet,
    ArrowUpRight,
    ArrowDownLeft,
    Lock
} from 'lucide-react';
import Link from 'next/link';
import api from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import Badge from '../../components/ui/Badge';

const fetcher = (url: string) => api.get(url).then(res => res.data);

export default function CreditsPage() {
    const { user } = useAuthStore();
    const { data: runHistory, error, isLoading } = useSWR('/run/history/me', fetcher);

    // Calculate total earned from history
    const totalEarned = runHistory?.runs?.reduce((acc: number, run: any) => acc + (run.creditsEarned || 0), 0) || 0;
    const recentRuns = runHistory?.runs?.slice(0, 10).reverse() || [];
    const maxCredits = Math.max(...recentRuns.map((r: any) => r.creditsEarned || 0), 10);

    return (
        <div className="min-h-screen pb-20 font-['Nunito'] bg-[#F4F7F4]">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8 space-y-6 md:space-y-8">

                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-6 mb-8 md:mb-12">
                    <div className="flex items-center gap-3 sm:gap-4 md:gap-6">
                        <Link href="/dashboard" className="p-2 sm:p-4 bg-white rounded-2xl border border-black/5 shadow-sm hover:shadow-md transition-all active:scale-95">
                            <ArrowLeft size={20} className="sm:w-6 sm:h-6 text-[#1a1a2e]" />
                        </Link>
                        <div>
                            <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-[#1a1a2e]">Treasury & Assets</h1>
                            <div className="flex items-center gap-1 sm:gap-2 mt-1">
                                <Badge variant="lavender">Vault Secured</Badge>
                                <span className="text-[8px] sm:text-[10px] font-black text-gray-400 uppercase tracking-widest">TRC Mainnet v2.1</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main HUD: Balance & Chart */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-8">
                    {/* Balanced HUD */}
                    <div className="lg:col-span-5 bg-white rounded-[32px] sm:rounded-[40px] border border-black/5 p-6 sm:p-8 lg:p-10 shadow-sm relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-48 sm:w-64 h-48 sm:h-64 bg-[#C3B1E1] opacity-[0.03] rounded-full -mr-20 -mt-20 blur-3xl" />

                        <div className="relative z-10 flex flex-col h-full justify-between">
                            <div>
                                <div className="flex items-center gap-2 sm:gap-3 mb-6 sm:mb-8">
                                    <div className="w-10 sm:w-12 h-10 sm:h-12 bg-[#F8F5FE] rounded-2xl flex items-center justify-center text-[#C3B1E1] shadow-inner">
                                        <Wallet size={20} className="sm:w-6 sm:h-6" />
                                    </div>
                                    <span className="text-[8px] sm:text-xs font-black text-[#1a1a2e] uppercase tracking-widest">Available TRC</span>
                                </div>
                                <div className="space-y-1">
                                    <h2 className="text-5xl sm:text-6xl md:text-7xl font-black text-[#1a1a2e] tracking-tight">
                                        {user?.credits?.toLocaleString() || 0}
                                    </h2>
                                    <div className="flex items-center gap-2">
                                        <TrendingUp size={16} className="text-[#6CC89A]" />
                                        <span className="text-sm font-bold text-[#6CC89A]">+12.4% vs last week</span>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-12 pt-8 border-t border-gray-50 flex items-center justify-between">
                                <div className="flex -space-x-2">
                                    {[1, 2, 3].map(i => (
                                        <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-gray-100 flex items-center justify-center text-[10px] font-black text-gray-400 uppercase">
                                            {String.fromCharCode(64 + i)}
                                        </div>
                                    ))}
                                    <div className="w-8 h-8 rounded-full border-2 border-white bg-[#F8F5FE] flex items-center justify-center text-[10px] font-black text-[#C3B1E1]">
                                        +42
                                    </div>
                                </div>
                                <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest leading-none text-right">Recently Active<br />Nodes</span>
                            </div>
                        </div>
                    </div>

                    {/* Historical Yield Chart */}
                    <div className="lg:col-span-7 bg-white rounded-[40px] border border-black/5 p-10 shadow-sm flex flex-col justify-between">
                        <div className="flex justify-between items-start mb-8">
                            <div>
                                <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Operational Yield</h3>
                                <h2 className="text-3xl font-black text-[#1a1a2e]">
                                    {totalEarned.toLocaleString()} <span className="text-sm text-gray-300">Total TRC</span>
                                </h2>
                            </div>
                            <div className="px-5 py-2.5 bg-[#F0F7F4] text-[#2E7D52] rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-sm">
                                {runHistory?.runs?.length || 0} Successful Missions
                            </div>
                        </div>

                        {/* Chart Visualization */}
                        <div className="h-40 flex items-end gap-2.5 px-2">
                            {recentRuns.length > 0 ? (
                                recentRuns.map((run: any, i: number) => (
                                    <motion.div
                                        key={run._id}
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: `${(run.creditsEarned / maxCredits) * 100}%`, opacity: 1 }}
                                        transition={{ delay: i * 0.05 }}
                                        className="flex-1 bg-gradient-to-t from-[#C3B1E1] to-[#A594D3] rounded-t-xl relative group cursor-pointer"
                                    >
                                        <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-[#1a1a2e] text-white text-[10px] font-black px-2 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-xl z-20">
                                            +{run.creditsEarned} TRC
                                        </div>
                                    </motion.div>
                                ))
                            ) : (
                                <div className="w-full h-px bg-gray-100 self-center" />
                            )}
                        </div>
                        <div className="flex justify-between mt-4 px-2">
                            <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Phase Start</span>
                            <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Active Ops</span>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Protocol Details */}
                    <div className="lg:col-span-8 space-y-8">
                        {/* Decay Alert */}
                        <div className="bg-[#FFF9F1] border border-[#FFD6A5]/30 rounded-[32px] p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm">
                            <div className="flex items-center gap-6">
                                <div className="w-16 h-16 bg-white rounded-[24px] flex items-center justify-center text-[#FFD6A5] shadow-sm border border-[#FFD6A5]/10">
                                    <Clock className="animate-pulse" size={32} />
                                </div>
                                <div>
                                    <h4 className="text-sm font-black text-[#E67E22] uppercase tracking-widest mb-1">Decay Counter Active</h4>
                                    <p className="text-xs font-bold text-gray-400">Claim 1+ new Hex within 14h to prevent balance reduction.</p>
                                </div>
                            </div>
                            <Link href="/run" className="w-full md:w-auto px-8 py-4 bg-[#FFD6A5] text-[#E67E22] rounded-2xl font-black text-xs uppercase tracking-widest hover:shadow-lg transition-all active:scale-95 text-center">
                                Deploy Unit
                            </Link>
                        </div>

                        {/* Protocol Mechanics Grid */}
                        <section>
                            <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.3em] mb-6 flex items-center gap-3">
                                <Shield size={18} className="text-[#C3B1E1]" /> Economic Guardrails
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <MechanicCard
                                    icon={<Zap size={22} />}
                                    title="Strategic Flow"
                                    desc="Claiming adjacent hexes triggers a 1.5x Chain Bonus to all credits earned."
                                    color="#6CC89A"
                                    bg="#F0F7F4"
                                />
                                <MechanicCard
                                    icon={<Coins size={22} />}
                                    title="Staking Yield"
                                    desc="Owned territories generate passive TRC every 6 hours if defenses remain intact."
                                    color="#C3B1E1"
                                    bg="#F8F5FE"
                                />
                                <MechanicCard
                                    icon={<TrendingDown size={22} />}
                                    title="Burn Rate"
                                    desc="Invasion attempts scale in cost based on target city density and rank."
                                    color="#F4B8C1"
                                    bg="#FDF2F3"
                                />
                                <MechanicCard
                                    icon={<Bot size={22} />}
                                    title="AI Concierge"
                                    desc="Redeem TRC for custom route planning optimized by our tactical AI model."
                                    color="#FFD6A5"
                                    bg="#FFF9F1"
                                />
                            </div>
                        </section>

                        {/* Strategy Promo */}
                        <section className="bg-gradient-to-br from-[#A594D3] to-[#C3B1E1] rounded-[48px] p-12 relative overflow-hidden group shadow-lg">
                            <div className="absolute right-0 bottom-0 opacity-10 group-hover:scale-110 transition-transform duration-700 pointer-events-none">
                                <Bot size={280} />
                            </div>
                            <div className="relative z-10 max-w-lg">
                                <Badge variant="lavender" className="bg-white/20 text-white mb-6 border-transparent">AI ENHANCED</Badge>
                                <h3 className="text-4xl font-black text-white mb-4 tracking-tight">Need a tactical edge?</h3>
                                <p className="text-white/80 text-lg font-bold mb-8 leading-relaxed">
                                    Establish a neural link with our strategy bot for real-time market analysis and movement optimizing.
                                </p>
                                <Link href="/community" className="inline-flex items-center gap-3 px-10 py-5 bg-white text-[#A594D3] rounded-[24px] font-black text-xs uppercase tracking-widest hover:shadow-xl hover:-translate-y-1 transition-all active:scale-95 shadow-md">
                                    Open Comms <ChevronRight size={18} />
                                </Link>
                            </div>
                        </section>
                    </div>

                    {/* Transaction History Sidebar */}
                    <div className="lg:col-span-4 space-y-6">
                        <section className="bg-white rounded-[40px] border border-black/5 overflow-hidden shadow-sm">
                            <div className="p-8 border-b border-gray-50 flex items-center justify-between">
                                <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.3em]">Op History</h3>
                                <div className="p-2 bg-gray-50 rounded-lg text-gray-300">
                                    <History size={16} />
                                </div>
                            </div>
                            <div className="max-h-[600px] overflow-y-auto divide-y divide-gray-50 scrollbar-hide">
                                {runHistory?.runs?.length > 0 ? (
                                    runHistory.runs.slice(0, 10).map((run: any) => (
                                        <div
                                            key={run._id}
                                            className="p-6 flex items-center justify-between hover:bg-gray-50/30 transition-all group"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 bg-[#F0F7F4] rounded-2xl flex items-center justify-center text-[#6CC89A] shadow-inner">
                                                    <ArrowUpRight size={20} />
                                                </div>
                                                <div>
                                                    <div className="text-sm font-black text-[#1a1a2e] group-hover:text-[#C3B1E1] transition-colors">
                                                        Zone Claim
                                                    </div>
                                                    <div className="text-[10px] text-gray-300 font-black uppercase tracking-widest">
                                                        {new Date(run.endedAt || run.updatedAt || run.createdAt).toLocaleDateString()} • {run._id.slice(-6).toUpperCase()}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-sm font-black text-[#6CC89A]">+{run.creditsEarned} TRC</div>
                                                <div className="text-[10px] font-black text-gray-200 uppercase tracking-widest">Success</div>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="py-20 text-center opacity-30 italic px-8">
                                        <ShieldAlert className="mx-auto mb-4" size={32} />
                                        <p className="text-[10px] font-black uppercase tracking-widest">No operations recorded on this node.</p>
                                    </div>
                                )}
                            </div>
                            <div className="p-8 bg-gray-50/50">
                                <Link href="/profile" className="flex items-center justify-center gap-3 w-full py-4 bg-white border border-black/5 rounded-2xl text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-[#1a1a2e] transition-all shadow-sm active:scale-95">
                                    Chain Integrity Verified <ShieldCheck size={16} className="text-[#6CC89A]" />
                                </Link>
                            </div>
                        </section>
                    </div>
                </div>
            </div>
        </div>
    );
}

function MechanicCard({ icon, title, desc, color, bg }: any) {
    return (
        <div className="bg-white p-8 rounded-[32px] border border-black/5 group hover:shadow-md transition-all shadow-sm">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-8 shadow-inner border border-black/[0.02]" style={{ backgroundColor: bg, color: color }}>
                {icon}
            </div>
            <h4 className="text-sm font-black uppercase tracking-widest mb-3" style={{ color: color }}>{title}</h4>
            <p className="text-xs font-bold text-gray-400 leading-relaxed uppercase tracking-tight">
                {desc}
            </p>
        </div>
    );
}

function ShieldCheck({ size, className }: any) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
        >
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
            <path d="m9 12 2 2 4-4" />
        </svg>
    );
}
