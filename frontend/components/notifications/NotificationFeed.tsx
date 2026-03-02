'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Bell,
    Zap,
    Trophy,
    TrendingDown,
    Clock,
    ShieldAlert,
    ChevronRight,
    Terminal,
    Swords,
    Activity
} from 'lucide-react';

interface Notification {
    id: string;
    type: 'invasion_alert' | 'rank_drop' | 'rank_up' | 'achievement_unlocked' | 'system';
    title: string;
    body: string;
    createdAt: string;
    isRead: boolean;
}

// 5.8 Notification Type Mapping
const INTEL_MAP = {
    invasion_alert: { 
        icon: Swords, 
        color: '#FF2244', // Danger Red
        label: 'INVASION_ALERT',
        border: 'border-l-[#FF2244]' 
    },
    rank_drop: { 
        icon: Zap, 
        color: '#FF6B35', // Neon Orange
        label: 'STREAK_WARNING',
        border: 'border-l-[#FF6B35]' 
    },
    rank_up: { 
        icon: Activity, 
        color: '#00C896', // Electric Green
        label: 'RANK_CHANGE',
        border: 'border-l-[#00C896]' 
    },
    achievement_unlocked: { 
        icon: Trophy, 
        color: '#FFB300', // Amber Gold
        label: 'ACHIEVEMENT',
        border: 'border-l-[#FFB300]' 
    },
    system: { 
        icon: Terminal, 
        color: '#6B7280', // Muted Slate
        label: 'SYSTEM_LOG',
        border: 'border-l-[#6B7280]' 
    },
};

interface NotificationFeedProps {
    notifications: Notification[];
}

export default function NotificationFeed({ notifications }: NotificationFeedProps) {
    if (notifications.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-white/10 bg-white/[0.02]">
                <div className="w-12 h-12 flex items-center justify-center border border-white/20 mb-4 opacity-20">
                    <Bell size={24} />
                </div>
                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[#6B7280]">
                    // Frequencies_Clear //
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-2 font-['Inter']">
            <AnimatePresence mode="popLayout">
                {notifications.map((notif, index) => {
                    const Config = INTEL_MAP[notif.type] || INTEL_MAP.system;
                    const Icon = Config.icon;

                    return (
                        <motion.div
                            key={notif.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, scale: 0.98 }}
                            transition={{ duration: 0.2, delay: index * 0.03 }}
                            className={`group relative flex gap-5 p-5 border border-white/5 transition-all cursor-pointer ${
                                notif.isRead 
                                    ? 'bg-black opacity-50 grayscale' 
                                    : `bg-white/[0.03] border-l-4 ${Config.border} shadow-[0_10px_30px_rgba(0,0,0,0.4)]`
                            }`}
                        >
                            {/* Unread Pulse Indicator */}
                            {!notif.isRead && (
                                <div className="absolute top-2 right-2 flex gap-1">
                                    <span className="w-1 h-1 bg-current animate-pulse" style={{ color: Config.color }} />
                                    <span className="text-[7px] font-black uppercase tracking-tighter opacity-40">Live_Intel</span>
                                </div>
                            )}

                            {/* Tactical Icon Box */}
                            <div className="flex-shrink-0">
                                <div 
                                    className="w-12 h-12 flex items-center justify-center border border-white/10"
                                    style={{ backgroundColor: `${Config.color}10`, color: Config.color }}
                                >
                                    <Icon size={20} className={notif.type === 'invasion_alert' ? 'animate-pulse' : ''} />
                                </div>
                            </div>

                            {/* Intel Content */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-3 mb-1">
                                    <span 
                                        className="text-[9px] font-black uppercase tracking-[0.2em] font-['Space_Grotesk']"
                                        style={{ color: Config.color }}
                                    >
                                        {Config.label}
                                    </span>
                                    <div className="h-[1px] flex-1 bg-white/5" />
                                    <span className="text-[9px] font-['JetBrains_Mono'] text-[#6B7280] font-bold uppercase">
                                        {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                    </span>
                                </div>

                                <h4 className="text-sm font-black font-['Space_Grotesk'] text-[#E8E8F0] uppercase tracking-tight mb-1 truncate">
                                    {notif.title}
                                </h4>
                                
                                <p className="text-xs font-medium text-[#6B7280] leading-relaxed line-clamp-2 italic tracking-tight">
                                    // {notif.body}
                                </p>
                            </div>

                            {/* View Action */}
                            <div className="flex items-center pl-2">
                                <div className="w-8 h-8 flex items-center justify-center border border-white/5 group-hover:border-[#00C896] group-hover:text-[#00C896] transition-all">
                                    <ChevronRight size={14} />
                                </div>
                            </div>
                        </motion.div>
                    );
                })}
            </AnimatePresence>
        </div>
    );
}