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
    { label: 'RUN', icon: Play, href: '/run', isAction: true },
    { label: 'Ranks', icon: Trophy, href: '/leaderboard' },
    { label: 'Chat', icon: MessageSquare, href: '/community' },
    { label: 'Exit', icon: LogOut, href: '/logout', isLogout: true },
];

export default function BottomNav() {
    const pathname = usePathname();

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-[60] bg-white border-t border-black/5 px-2 safe-area-bottom shadow-[0_-4px_20px_rgba(0,0,0,0.07)] md:hidden">
            <div className="flex items-center justify-around h-[70px]">
                {NAV_ITEMS.map((item) => {
                    const isActive = pathname === item.href;
                    const Icon = item.icon;

                    if (item.isAction) {
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className="relative -top-3 flex flex-col items-center justify-center"
                            >
                                <div
                                    className="w-[46px] h-[46px] rounded-[16px] flex items-center justify-center text-white border-[3px] border-white shadow-[0_6px_24px_rgba(168,213,186,0.5)] transition-transform active:scale-95"
                                    style={{ background: 'linear-gradient(135deg, #A8D5BA, #6CC89A)' }}
                                >
                                    <Icon size={24} fill="currentColor" />
                                </div>
                                <span className={`text-[10px] font-extrabold tracking-tight mt-1 ${isActive ? 'text-[#2E7D52]' : 'text-gray-400'}`}>
                                    {item.label}
                                </span>
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
                                className="flex-1 flex flex-col items-center justify-center gap-1 group"
                            >
                                <div className="w-[34px] h-[34px] rounded-[12px] flex items-center justify-center text-red-300">
                                    <Icon size={20} />
                                </div>
                                <span className="text-[10px] tracking-tight font-semibold text-gray-400">
                                    {item.label}
                                </span>
                            </button>
                        );
                    }

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className="flex-1 flex flex-col items-center justify-center gap-1 group"
                        >
                            <div className={`
                                w-[34px] h-[34px] rounded-[12px] flex items-center justify-center transition-all
                                ${isActive ? 'bg-[#F0F7F4] text-[#2E7D52]' : 'text-gray-400'}
                            `}>
                                <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                            </div>
                            <span className={`text-[10px] tracking-tight ${isActive ? 'font-extrabold text-[#2E7D52]' : 'font-semibold text-gray-400'}`}>
                                {item.label}
                            </span>
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}
