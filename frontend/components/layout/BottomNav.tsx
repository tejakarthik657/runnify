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
    LogOut
} from 'lucide-react';

const NAV_ITEMS = [
    { label: 'Home', icon: LayoutDashboard, href: '/dashboard' },
    { label: 'Map', icon: Map, href: '/map' },
    { label: 'Run', icon: Play, href: '/run', isAction: true },
    { label: 'Ranks', icon: Trophy, href: '/leaderboard' },
    { label: 'Chat', icon: MessageSquare, href: '/community' },
    { label: 'Exit', icon: LogOut, href: '/logout', isLogout: true },
];

export default function BottomNav() {
    const pathname = usePathname();

    return (
        <nav className="fixed bottom-5 left-4 right-4 z-[60] bg-white/80 border border-white/60 px-4 py-2.5 rounded-3xl safe-area-bottom shadow-premium lg:hidden backdrop-blur flex justify-around items-center">
            <div className="flex items-center justify-between w-full px-1">
                {NAV_ITEMS.map((item) => {
                    const isActive = pathname === item.href;
                    const Icon = item.icon;

                    if (item.isAction) {
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className="shrink-0 -mt-5"
                            >
                                <div
                                    className="w-12 h-12 rounded-full text-white border-2 border-white flex items-center justify-center shadow-[0_8px_24px_rgba(108,200,154,0.3)] transition-transform active:scale-90"
                                    style={{ background: 'linear-gradient(135deg, #A8D5BA, #6CC89A)' }}
                                >
                                    <Icon size={22} fill="currentColor" />
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
                                className="shrink-0 flex flex-col items-center gap-0.5 text-gray-400 active:scale-95"
                            >
                                <Icon size={18} className="text-red-400/80" />
                                <span className="text-[8px] tracking-wide font-black text-red-400/70 uppercase">
                                    {item.label}
                                </span>
                            </button>
                        );
                    }

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`shrink-0 flex flex-col items-center gap-0.5 transition-all active:scale-95 ${
                                isActive ? 'text-[#2E7D52]' : 'text-gray-400 hover:text-gray-600'
                            }`}
                        >
                            <Icon size={18} strokeWidth={isActive ? 3 : 2} />
                            <span className={`text-[8px] tracking-wide uppercase ${isActive ? 'font-black' : 'font-bold'}`}>
                                {item.label}
                            </span>
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}
