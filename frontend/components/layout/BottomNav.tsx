'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
    LayoutDashboard,
    Map,
    Trophy,
    MessageSquare,
    Play,
    LogOut,
    Activity
} from 'lucide-react';

const NAV_ITEMS = [
    { label: 'Home', icon: LayoutDashboard, href: '/dashboard' },
    { label: 'Map', icon: Map, href: '/map' },
    { label: 'Run', icon: Play, href: '/run', isAction: true },
    { label: 'Python', icon: Activity, href: '/python-demo' },
    { label: 'Ranks', icon: Trophy, href: '/leaderboard' },
    { label: 'Chat', icon: MessageSquare, href: '/community' },
    { label: 'Exit', icon: LogOut, href: '/logout', isLogout: true },
];

export default function BottomNav() {
    const pathname = usePathname();

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-[60] bg-white/95 border-t border-black/5 px-2 py-2 safe-area-bottom shadow-[0_-4px_20px_rgba(0,0,0,0.07)] lg:hidden backdrop-blur">
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                {NAV_ITEMS.map((item) => {
                    const isActive = pathname === item.href;
                    const Icon = item.icon;

                    if (item.isAction) {
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className="shrink-0"
                            >
                                <div
                                    className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-white border border-white/40 shadow-[0_6px_24px_rgba(168,213,186,0.5)] transition-transform active:scale-95"
                                    style={{ background: 'linear-gradient(135deg, #A8D5BA, #6CC89A)' }}
                                >
                                    <Icon size={16} fill="currentColor" />
                                    <span className="text-[11px] font-black uppercase tracking-wider">{item.label}</span>
                                </div>
                            </Link>
                        );
                    }

                    if (item.isLogout) {
                        return (
                            <button
                                key="logout-btn"
                                onClick={() => {
                                    require('../../services/api').default.post('/auth/logout').finally(() => {
                                        const { useAuthStore } = require('../../store/authStore');
                                        useAuthStore.getState().logout();
                                        window.location.href = '/login';
                                    });
                                }}
                                className="shrink-0 inline-flex items-center gap-1.5 rounded-full px-3 py-2 border border-transparent text-gray-500 active:scale-95"
                            >
                                <Icon size={15} className="text-red-400" />
                                <span className="text-[11px] tracking-wide font-bold text-red-400 uppercase">
                                    {item.label}
                                </span>
                            </button>
                        );
                    }

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`shrink-0 inline-flex items-center gap-1.5 rounded-full px-3 py-2 border transition-all active:scale-95 ${
                                isActive ? 'border-[#A8D5BA]/50 bg-[#F0F7F4] text-[#2E7D52]' : 'border-transparent text-gray-500'
                            }`}
                        >
                            <Icon size={15} strokeWidth={isActive ? 2.5 : 2} />
                            <span className={`text-[11px] tracking-wide uppercase ${isActive ? 'font-black text-[#2E7D52]' : 'font-bold text-gray-500'}`}>
                                {item.label}
                            </span>
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}
