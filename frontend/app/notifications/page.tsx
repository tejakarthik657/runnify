'use client';

import React, { useEffect } from 'react';
import useSWR from 'swr';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Check, Clock, ArrowLeft, Loader2, Trophy, Zap, Swords, Trash2, ShieldCheck, ChevronRight, Hash, Target, Sparkles } from 'lucide-react';
import Link from 'next/link';
import api from '../../services/api';
import { useSocket } from '../../hooks/useSocket';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'react-hot-toast';
import Badge from '../../components/ui/Badge';

const fetcher = (url: string) => api.get(url).then(res => res.data);

const C = {
    sage: '#A8D5BA',
    sageDark: '#6CC89A',
    sageDeep: '#2E7D52',
    rose: '#F4B8C1',
    roseDeep: '#E89BA5',
    lavender: '#C3B1E1',
    lavenderDeep: '#A594D3',
    sky: '#B5D5F5',
    peach: '#FFD6A5',
    ink: '#1A1A2E',
    bg: '#F8FAF8',
    white: '#FFFFFF',
};

export default function NotificationsPage() {
    const { data: notificationsData, error, isLoading, mutate } = useSWR('/notifications/me', fetcher);
    const socket = useSocket('main');

    useEffect(() => {
        if (!socket) return;
        const handleNewNotification = (notification: any) => {
            mutate((prevData: any) => ({
                notifications: [notification, ...(prevData?.notifications || [])]
            }), false);
            toast.success(notification.title);
        };
        socket.on('notification', handleNewNotification);
        return () => { socket.off('notification', handleNewNotification); };
    }, [socket, mutate]);

    const markAllAsRead = async () => {
        try {
            await api.patch('/notifications/read-all');
            mutate();
            toast.success('Frequency Cleared');
        } catch (err: any) {
            toast.error('Sync failed');
        }
    };

    const getNotificationConfig = (type: string) => {
        switch (type) {
            case 'territory_lost':
                return { icon: <Swords size={20} />, color: C.roseDeep, bg: '#FDF2F3', label: 'Sector Invasion', border: C.rose };
            case 'achievement':
                return { icon: <Trophy size={20} />, color: C.lavenderDeep, bg: '#F8F5FE', label: 'Rank Update', border: C.lavender };
            case 'invasion_warning':
                return { icon: <Zap size={20} />, color: C.peach, bg: '#FFF9F1', label: 'Field Alert', border: C.peach };
            case 'system':
                return { icon: <ShieldCheck size={20} />, color: C.sageDeep, bg: '#F0F7F4', label: 'System Intel', border: C.sage };
            default:
                return { icon: <Bell size={20} />, color: C.sky, bg: '#F1F7FD', label: 'Dispatch', border: C.sky };
        }
    };

    const notifications = notificationsData?.notifications || [];

    return (
        <div className="min-h-screen pb-20 font-['Nunito'] bg-[#F8FAF8]">
            <div className="max-w-4xl mx-auto p-4 md:p-12">

                {/* --- PREMIUM HEADER --- */}
                <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-8">
                    <div className="flex items-center gap-8">
                        <Link href="/dashboard" className="w-14 h-14 bg-white rounded-2xl border border-black/5 shadow-sm hover:shadow-xl hover:scale-105 transition-all flex items-center justify-center group active:scale-95">
                            <ArrowLeft size={24} className="text-[#1A1A2E] group-hover:-translate-x-1 transition-transform" />
                        </Link>
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#A8D5BA]">HQ Intelligence</span>
                                <Badge variant="sage" className="px-2 py-0.5 text-[9px] font-black" pulse>Live</Badge>
                            </div>
                            <h1 className="text-4xl md:text-5xl font-extrabold font-['Syne'] text-[#1A1A2E] tracking-tighter">
                                Intel <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#A8D5BA] to-[#6CC89A]">Feed</span>
                            </h1>
                        </div>
                    </div>

                    {notifications.length > 0 && (
                        <button
                            onClick={markAllAsRead}
                            className="flex items-center gap-3 px-6 py-4 bg-white border border-black/5 rounded-2xl text-[#1A1A2E] hover:text-[#E89BA5] hover:border-[#F4B8C1]/30 transition-all shadow-sm active:scale-95 group"
                        >
                            <Trash2 size={18} className="text-gray-300 group-hover:text-[#E89BA5] transition-colors" />
                            <span className="text-xs font-black uppercase tracking-widest">Clear Uplink</span>
                        </button>
                    )}
                </div>

                {/* --- NOTIFICATIONS LIST --- */}
                <div className="space-y-6">
                    {isLoading ? (
                        <div className="py-40 text-center flex flex-col items-center">
                            <div className="relative mb-8">
                                <motion.div
                                    animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.2, 0.5] }}
                                    transition={{ duration: 2, repeat: Infinity }}
                                    className="absolute inset-0 bg-[#A8D5BA]/20 rounded-full blur-2xl"
                                />
                                <Loader2 className="animate-spin text-[#A8D5BA] relative z-10" size={56} strokeWidth={1.5} />
                            </div>
                            <p className="text-sm font-black uppercase tracking-[0.3em] text-gray-400 italic">Syncing Strategic Channels...</p>
                        </div>
                    ) : notifications.length > 0 ? (
                        <AnimatePresence mode="popLayout">
                            {notifications.map((notif: any) => {
                                const cfg = getNotificationConfig(notif.type);
                                return (
                                    <motion.div
                                        layout
                                        initial={{ opacity: 0, scale: 0.98, y: 10 }}
                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.98, x: 20 }}
                                        key={notif._id}
                                        className={`
                                            relative bg-white p-6 md:p-8 rounded-[40px] border border-black/5 transition-all shadow-sm group
                                            ${!notif.read ? 'hover:shadow-2xl hover:shadow-green-100/30 ring-4 ring-black/5' : 'opacity-60 md:hover:opacity-100'}
                                        `}
                                    >
                                        <div className="flex flex-col md:flex-row gap-6 md:items-start">
                                            <div className="flex-shrink-0 flex items-center justify-center">
                                                <div className="w-16 h-16 rounded-[24px] flex items-center justify-center shadow-inner relative group-hover:scale-110 transition-transform" style={{ backgroundColor: `${cfg.color}15`, color: cfg.color }}>
                                                    {cfg.icon}
                                                    <div className="absolute -inset-1 rounded-[24px] border-2 border-white pointer-events-none" />
                                                </div>
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <div className="flex flex-wrap items-center justify-between mb-4 gap-4">
                                                    <div className="flex items-center gap-3">
                                                        <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest text-[#1A1A2E]" style={{ backgroundColor: `${cfg.color}20` }}>
                                                            {cfg.label}
                                                        </span>
                                                        {!notif.read && (
                                                            <div className="w-2 h-2 rounded-full animate-pulse shadow-sm" style={{ backgroundColor: cfg.color }} />
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-2 text-[10px] font-black text-gray-300 uppercase tracking-widest">
                                                        <Clock size={12} strokeWidth={3} />
                                                        {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true })}
                                                    </div>
                                                </div>

                                                <h3 className="text-xl font-extrabold text-[#1A1A2E] mb-2 leading-tight font-['Syne']">
                                                    {notif.title}
                                                </h3>
                                                <p className="text-sm font-bold leading-relaxed text-slate-400 max-w-2xl">
                                                    {notif.message}
                                                </p>

                                                {!notif.read && (
                                                    <div className="mt-8 flex flex-wrap items-center gap-6">
                                                        <motion.button
                                                            whileHover={{ scale: 1.02 }}
                                                            whileTap={{ scale: 0.98 }}
                                                            onClick={() => api.patch(`/notifications/${notif._id}/read`).then(() => mutate())}
                                                            className="px-8 py-3.5 bg-[#1A1A2E] text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl hover:bg-[#2E7D52] transition-colors"
                                                        >
                                                            Acknowledge dispatch
                                                        </motion.button>

                                                        <Link
                                                            href={notif.type === 'territory_lost' ? '/map' : '/dashboard'}
                                                            className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[#A8D5BA] hover:text-[#6CC89A] transition-all group-investigate"
                                                        >
                                                            Intercept Field Data
                                                            <ArrowRight size={14} className="group-investigate-hover:translate-x-1 transition-transform" />
                                                        </Link>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </AnimatePresence>
                    ) : (
                        <div className="py-40 bg-white rounded-[64px] border-2 border-dashed border-slate-100 flex flex-col items-center text-center p-12 shadow-sm">
                            <div className="w-28 h-28 bg-[#F8FAF8] rounded-[48px] flex items-center justify-center text-slate-200 mb-10 border border-black/5 shadow-inner">
                                <Sparkles size={48} className="animate-pulse" />
                            </div>
                            <h3 className="text-2xl font-black text-[#1A1A2E] mb-3 font-['Syne'] uppercase tracking-tighter">Zero Hostile Signals</h3>
                            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest italic opacity-60 max-w-sm leading-relaxed">
                                Scanner frequency 104.2MHz clear. No recent tactical dispatches for your sector.
                            </p>
                        </div>
                    )}
                </div>

                {/* --- FOOTER STATUS --- */}
                <div className="mt-16 pt-10 border-t border-black/5 flex justify-between items-center px-4">
                    <div className="flex items-center gap-3">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#B5D5F5]" />
                        <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Grid Status: Passive</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <ShieldCheck size={14} className="text-[#A8D5BA]" />
                        <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Liaison Connected</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

const ArrowRight = ({ size, className }: any) => (
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
        <path d="M5 12h14m-7-7 7 7-7 7" />
    </svg>
);
