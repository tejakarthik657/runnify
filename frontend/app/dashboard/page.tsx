'use client';

import React from 'react';
import useSWR from 'swr';
import { motion } from 'framer-motion';
import { useAuthStore } from '../../store/authStore';
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
    Navigation2
} from 'lucide-react';
import Link from 'next/link';
import StatCard from '../../components/ui/StatCard';
import RunButton from '../../components/ui/RunButton';
import Badge from '../../components/ui/Badge';
import ActivityStrip from '../../components/ui/ActivityStrip';
import MomentsTray from '../../components/dashboard/MomentsTray';

const fetcher = (url: string) => api.get(url).then(res => res.data);

export default function DashboardPage() {
    const { user } = useAuthStore();
    const { data: meData } = useSWR('/auth/me', fetcher);
    const { data: rankData } = useSWR('/leaderboard/me', fetcher);
    const { data: runHistory } = useSWR('/run/history/me', fetcher);
    const { data: globalInvasions } = useSWR('/map/invasions?limit=10', fetcher, { refreshInterval: 10000 });

    const currentUser = meData?.user || user;

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
                                <div className="text-center py-12 border-2 border-dashed border-gray-100 rounded-2xl">
                                    <p className="text-sm font-bold text-gray-400">No missions logged yet</p>
                                </div>
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
