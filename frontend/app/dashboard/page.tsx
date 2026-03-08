'use client';

import React, { useEffect, useState } from 'react';
import useSWR from 'swr';
import { motion } from 'framer-motion';
import { useAuthStore } from '../../store/authStore';
import { useSocket } from '../../hooks/useSocket';
import api from '../../services/api';
import {
    Trophy,
    Map as MapIcon,
    Zap,
    Activity,
    Users,
    ChevronRight,
    Bell,
    CreditCard,
    Settings,
    Layers,
    Navigation2,
    Play,
    ArrowRight
} from 'lucide-react';
import Link from 'next/link';
import StatCard from '../../components/ui/StatCard';
import RunButton from '../../components/ui/RunButton';
import Badge from '../../components/ui/Badge';
import ActivityStrip from '../../components/ui/ActivityStrip';
import MomentsTray from '../../components/dashboard/MomentsTray';

const fetcher = (url: string) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    return api.get(url, { signal: controller.signal })
        .then(res => {
            clearTimeout(timeoutId);
            return res.data;
        })
        .catch(err => {
            clearTimeout(timeoutId);
            // Return fallback data on timeout
            if (err.code === 'ECONNABORTED' || err.signal?.aborted) {
                console.warn(`Dashboard request timeout for ${url}, using fallback`);
                return null; // Let component handle null gracefully
            }
            throw err;
        });
};

export default function DashboardPage() {
    const { user, updateUser } = useAuthStore();
    const socket = useSocket('main');
    const [liveStats, setLiveStats] = useState<any>(null);
    
    const { data: meData, mutate: mutateMeData } = useSWR('/auth/me', fetcher, {
        errorRetryCount: 2,
        errorRetryInterval: 2000,
        dedupingInterval: 30000,
    });
    const { data: rankData } = useSWR('/leaderboard/me', fetcher, {
        errorRetryCount: 1,
        dedupingInterval: 30000,
    });
    const { data: runHistory } = useSWR('/run/history/me', fetcher, {
        errorRetryCount: 1,
        dedupingInterval: 60000,
    });
    const { data: globalInvasions } = useSWR('/map/invasions?limit=10', fetcher, { 
        refreshInterval: 10000,
        dedupingInterval: 5000,
        errorRetryCount: 1,
    });

    const currentUser = liveStats ? { ...meData?.user || user, ...liveStats } : (meData?.user || user);

    // Listen for real-time stat updates
    useEffect(() => {
        if (!socket) return;

        const handleStatsUpdate = (data: any) => {
            setLiveStats(data);
            if (user?.id === data.userId) {
                updateUser(data);
            }
        };

        const handleRankUpdate = (data: any) => {
            setLiveStats((prev: any) => ({ ...prev, rank: data.rank }));
        };

        const handleCreditsUpdate = (data: any) => {
            setLiveStats((prev: any) => ({ ...prev, credits: data.credits }));
        };

        socket.on('user_stats_update', handleStatsUpdate);
        socket.on('rank_update', handleRankUpdate);
        socket.on('credits_update', handleCreditsUpdate);

        return () => {
            socket.off('user_stats_update', handleStatsUpdate);
            socket.off('rank_update', handleRankUpdate);
            socket.off('credits_update', handleCreditsUpdate);
        };
    }, [socket, user?.id, updateUser]);

    // Derived ActivityStrip data
    const activities = (globalInvasions?.invasions || []).map((inv: any) => ({
        id: inv._id,
        invader: { username: inv.invaderUsername, color: '#A8D5BA' },
        victim: { username: inv.victimUsername, color: '#F4B8C1' },
        locationText: inv.hexCity || 'Sector_01',
        timeText: new Date(inv.occurredAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }));

    return (
        <div className="space-y-8 pb-12">
            {/* Activity Strip */}
            <div className="-mx-4 md:-mx-6 lg:-mx-8 -mt-4 md:-mt-6 lg:-mt-8">
                <ActivityStrip activities={activities.length > 0 ? activities : [
                    { id: '1', invader: { username: 'System_Log' }, victim: { username: 'Sector_01' }, locationText: 'Neutral Zone', timeText: 'Just now' }
                ]} />
            </div>

            {/* Greeting Banner */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-2 sm:gap-3 md:gap-4">
                <div>
                    <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-black tracking-tight text-[#1a1a2e]">
                        Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 18 ? 'Afternoon' : 'Evening'}, {currentUser?.username || 'Player'} 👋
                    </h1>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 mt-2">
                        <Badge variant="sage" pulse>Active Status: Tactical</Badge>
                        <span className="text-xs sm:text-sm font-bold text-gray-400">
                            Current Location: <span className="text-[#1a1a2e]">{currentUser?.city || 'Sector_01'}</span>
                        </span>
                    </div>
                </div>
                <div className="bg-white p-3 sm:p-4 rounded-2xl border border-black/5 shadow-sm flex items-center gap-2 sm:gap-4 w-full sm:w-auto">
                    <div className="w-9 sm:w-10 h-9 sm:h-10 rounded-xl bg-[#F0F7F4] flex items-center justify-center text-[#2E7D52] flex-shrink-0">
                        <Layers size={18} className="sm:w-5 sm:h-5" />
                    </div>
                    <div className="min-w-0">
                        <div className="text-[8px] sm:text-[10px] font-black text-gray-400 uppercase tracking-widest">Territory Control</div>
                        <div className="text-xs sm:text-sm font-extrabold text-[#1a1a2e] truncate">12% of Sector 7</div>
                    </div>
                </div>
            </div>

            {/* Run Moments Tray */}
            <div className="lg:hidden">
                <Link
                    href="/faction"
                    className="group w-full inline-flex items-center justify-between rounded-2xl border border-[#A8D5BA]/30 bg-white px-4 py-3 shadow-sm"
                >
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-[#F0F7F4] text-[#2E7D52] flex items-center justify-center">
                            <Zap size={18} />
                        </div>
                        <div className="min-w-0">
                            <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Global Wars</div>
                            <div className="text-sm font-extrabold text-[#1a1a2e] truncate">
                                {currentUser?.faction ? 'Manage Your Faction' : 'Choose Your Faction'}
                            </div>
                        </div>
                    </div>
                    <ArrowRight size={16} className="text-[#2E7D52] group-active:translate-x-0.5 transition-transform" />
                </Link>
            </div>

            <div className="bg-white/50 backdrop-blur-sm rounded-[40px] p-6 border border-black/5 shadow-sm">
                <MomentsTray />
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4 lg:gap-6">
                <StatCard
                    label="Global Rank"
                    value={`#${rankData?.rank || '---'}`}
                    subText={`in ${currentUser?.city || 'Central'}`}
                    icon={<Trophy size={18} />}
                    color="blue"
                />
                <StatCard
                    label="Territory"
                    value={currentUser?.hexesOwned || '0'}
                    subText="Hexes Owned"
                    icon={<MapIcon size={18} />}
                    color="sage"
                />
                <StatCard
                    label="Credits"
                    value={currentUser?.credits || '0'}
                    subText="TRC Balance"
                    icon={<Zap size={18} />}
                    color="lavender"
                />
                <StatCard
                    label="Distance"
                    value={(currentUser?.stats?.totalKm || 0).toFixed(1)}
                    subText="Lifetime KM"
                    icon={<Activity size={18} />}
                    color="peach"
                />
            </div>

            <div className="rounded-3xl border border-[#A8D5BA]/25 bg-gradient-to-r from-white to-[#F3FAF5] p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Faction Impact</p>
                    <h3 className="text-lg font-black text-[#1a1a2e] mt-1">
                        {currentUser?.faction
                            ? `You are boosting ${currentUser.faction.toUpperCase()} control with every claimed hex.`
                            : 'Choose a faction to unlock war impact multipliers.'}
                    </h3>
                    <p className="text-sm font-semibold text-gray-600 mt-1">Faction-aligned runs improve strategic territory pressure in live wars.</p>
                </div>
                <Link href="/faction" className="shrink-0 px-4 py-2 rounded-xl bg-[#1a1a2e] text-white text-xs font-black uppercase tracking-wider text-center">
                    {currentUser?.faction ? 'Manage Faction' : 'Join Faction'}
                </Link>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Action & Activity */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Primary Action */}
                    <RunButton
                        href="/map"
                        large
                        label="Initialize Campaign"
                        subLabel="Deploy to the grid and claim sectors"
                        icon={<Navigation2 size={28} fill="currentColor" />}
                    />

                    {/* Mission Logs */}
                    <div className="bg-white rounded-[32px] border border-black/5 p-6 md:p-8 shadow-sm">
                        <div className="flex items-center justify-between mb-8">
                            <h3 className="text-lg font-black tracking-tight text-[#1a1a2e]">Mission Logs</h3>
                            <Link href="/profile" className="text-xs font-bold text-[#A8D5BA] hover:text-[#2E7D52] transition-colors">
                                View Full Archive
                            </Link>
                        </div>

                        <div className="space-y-3">
                            {runHistory?.runs?.length > 0 ? (
                                runHistory.runs.slice(0, 4).map((run: any) => (
                                    <div key={run._id} className="group flex items-center justify-between p-4 bg-[#F8FAFB] rounded-2xl hover:bg-[#F0F7F4] transition-all border border-transparent hover:border-[#A8D5BA]/20">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-[#1a1a2e] group-hover:text-[#2E7D52] shadow-sm">
                                                <Navigation2 size={16} />
                                            </div>
                                            <div>
                                                <div className="text-sm font-extrabold text-[#1a1a2e]">{(run.distance / 1000).toFixed(2)} KM Sortie</div>
                                                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{new Date(run.startTime).toLocaleDateString()}</div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-6">
                                            <div className="text-right">
                                                <div className="text-sm font-black text-[#2E7D52]">+{run.creditsEarned} TRC</div>
                                                <div className="text-[10px] font-extrabold text-gray-400">{run.hexesClaimed} HEX SECURED</div>
                                            </div>
                                            <ChevronRight size={16} className="text-gray-300 group-hover:text-[#2E7D52]" />
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <motion.div 
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#F0F7F4] via-white to-[#F0F7F4] p-8 sm:p-12 border border-[#A8D5BA]/20"
                                >
                                    {/* Animated Background Hexagons */}
                                    <div className="absolute inset-0 opacity-10">
                                        {[...Array(6)].map((_, i) => (
                                            <motion.div
                                                key={i}
                                                className="absolute w-16 h-16 border-2 border-[#A8D5BA]"
                                                style={{
                                                    left: `${20 + i * 15}%`,
                                                    top: `${30 + (i % 3) * 20}%`,
                                                    clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)'
                                                }}
                                                animate={{
                                                    y: [0, -10, 0],
                                                    opacity: [0.3, 0.6, 0.3]
                                                }}
                                                transition={{
                                                    duration: 3 + i * 0.5,
                                                    repeat: Infinity,
                                                    ease: "easeInOut"
                                                }}
                                            />
                                        ))}
                                    </div>

                                    {/* Content */}
                                    <div className="relative z-10 text-center space-y-6">
                                        <motion.div
                                            animate={{ scale: [1, 1.05, 1] }}
                                            transition={{ duration: 2, repeat: Infinity }}
                                            className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-br from-[#A8D5BA] to-[#6CC89A] flex items-center justify-center shadow-2xl shadow-[#A8D5BA]/30"
                                        >
                                            <MapIcon size={32} className="text-white" fill="white" fillOpacity={0.3} />
                                        </motion.div>
                                        
                                        <div>
                                            <h4 className="text-xl sm:text-2xl font-black text-[#1a1a2e] mb-3">Your Territory Awaits</h4>
                                            <p className="text-sm text-gray-500 font-bold max-w-md mx-auto leading-relaxed">
                                                <span className="text-[#2E7D52] font-black">Hundreds of hexes</span> are unclaimed in your area. Start your first run and watch your empire grow.
                                            </p>
                                        </div>

                                        {/* Motivational Stats */}
                                        <div className="grid grid-cols-3 gap-4 pt-4 max-w-sm mx-auto">
                                            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-3 border border-[#A8D5BA]/10">
                                                <div className="text-2xl font-black text-[#A8D5BA]">~50</div>
                                                <div className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Avg First Run</div>
                                            </div>
                                            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-3 border border-[#C3B1E1]/10">
                                                <div className="text-2xl font-black text-[#A594D3]">75+</div>
                                                <div className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">TRC Possible</div>
                                            </div>
                                            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-3 border border-[#FFD6A5]/10">
                                                <div className="text-2xl font-black text-[#E67E22]">2x</div>
                                                <div className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Peak Multiplier</div>
                                            </div>
                                        </div>

                                        <div className="pt-2">
                                            <Link 
                                                href="/map"
                                                className="inline-flex items-center gap-3 bg-[#1a1a2e] text-white px-8 py-4 rounded-2xl text-xs font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-2xl shadow-slate-900/20"
                                            >
                                                <Play size={16} fill="currentColor" />
                                                Launch First Mission
                                            </Link>
                                        </div>

                                        {/* Tip */}
                                        <motion.div
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            transition={{ delay: 1 }}
                                            className="flex items-start gap-3 bg-[#FFF7ED]/50 border border-[#FFD6A5]/30 rounded-2xl p-4 text-left max-w-md mx-auto"
                                        >
                                            <Zap size={16} className="text-[#E67E22] flex-shrink-0 mt-0.5" />
                                            <p className="text-[10px] font-bold text-gray-600 leading-relaxed">
                                                <span className="font-black text-[#E67E22]">PRO TIP:</span> Run during peak hours (6-9am, 5-8pm) for 2x territory multipliers. Your first 100 hexes unlock the <span className="font-black">Trailblazer</span> achievement.
                                            </p>
                                        </motion.div>
                                    </div>
                                </motion.div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Column: Quick Links & Alerts */}
                <div className="space-y-8">
                    {/* Quick Channels */}
                    <div className="bg-white rounded-[32px] border border-black/5 p-6 md:p-8 shadow-sm">
                        <h3 className="text-sm font-black uppercase tracking-widest text-gray-400 mb-6">Quick Channels</h3>
                        <div className="grid grid-cols-1 gap-3">
                            <QuickChannelLink href="/leaderboard" label="Global Ranks" sub="Who's winning today?" icon={<Trophy size={18} />} color="blue" />
                            <QuickChannelLink href="/community" label="Comms Channel" sub="Chat with your rivals" icon={<Users size={18} />} color="sage" />
                            <QuickChannelLink href="/credits" label="Economy" sub="TRC & Blockchain" icon={<CreditCard size={18} />} color="lavender" />
                            <QuickChannelLink href="/profile" label="Settings" sub="Calibrate your HUD" icon={<Settings size={18} />} color="peach" />
                        </div>
                    </div>

                    {/* Alerts Card */}
                    <div className="bg-[#F4B8C1]/10 rounded-[32px] border border-[#F4B8C1]/20 p-8 relative overflow-hidden group">
                        <div className="relative z-10">
                            <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-[#E89BA5] shadow-sm mb-4">
                                <Bell size={20} className="animate-bounce" />
                            </div>
                            <h3 className="text-lg font-black text-[#1a1a2e] mb-2">Unread Intel</h3>
                            <p className="text-sm text-gray-500 font-medium mb-4">Your territory in Sector 4 is under decay pressure.</p>
                            <Link href="/notifications" className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-[#E89BA5] hover:gap-3 transition-all">
                                Open Inbox <ChevronRight size={14} />
                            </Link>
                        </div>
                        <div className="absolute right-[-10%] bottom-[-10%] w-32 h-32 bg-[#F4B8C1]/10 rounded-full blur-2xl" />
                    </div>
                </div>
            </div>
        </div>
    );
}

function QuickChannelLink({ href, label, sub, icon, color }: any) {
    const colorClasses: any = {
        blue: 'bg-blue-50 text-[#2980B9]',
        sage: 'bg-[#F0F7F4] text-[#2E7D52]',
        lavender: 'bg-[#F5F3FF] text-[#A594D3]',
        peach: 'bg-[#FFF7ED] text-[#E67E22]',
    };

    return (
        <Link href={href} className="flex items-center gap-4 p-4 rounded-2xl hover:bg-gray-50 transition-all group">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${colorClasses[color]}`}>
                {icon}
            </div>
            <div className="flex-1">
                <div className="text-sm font-extrabold text-[#1a1a2e] group-hover:text-[#2E7D52] transition-colors">{label}</div>
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{sub}</div>
            </div>
            <ChevronRight size={14} className="text-gray-300 opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" />
        </Link>
    );
}
