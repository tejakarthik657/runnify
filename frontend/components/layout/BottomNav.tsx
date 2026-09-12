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
        <nav className="fixed bottom-5 left-4 right-4 z-[60] nintendo-carbon px-4 py-2.5 rounded-2xl safe-area-bottom shadow-2xl lg:hidden flex justify-around items-center border-t-2 border-[#5A5F8C]">
            <div className="flex items-center justify-between w-full px-1">
                {NAV_ITEMS.map((item) => {
                    const isActive = pathname === item.href;
                    const Icon = item.icon;

                    if (item.isAction) {
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className="shrink-0 -mt-6"
                            >
                                <div
                                    className="w-13 h-13 rounded-full btn-signal flex items-center justify-center transition-transform active:scale-90 shadow-lg"
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
                                className="shrink-0 flex flex-col items-center gap-0.5 text-[#E60012] active:scale-95"
                            >
                                <Icon size={18} className="text-[#E60012]" />
                                <span className="text-[9px] tracking-wider font-bold text-[#E60012] uppercase">
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
                                isActive ? 'text-[#E48600]' : 'text-[#9FBEE7] hover:text-[#FFFFFF]'
                            }`}
                        >
                            <Icon size={18} strokeWidth={isActive ? 3 : 2} />
                            <span className={`text-[9px] tracking-wider uppercase ${isActive ? 'font-black text-[#E48600]' : 'font-bold text-[#9FBEE7]'}`}>
                                {item.label}
                            </span>
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}
