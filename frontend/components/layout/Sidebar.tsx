'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard,
    Map,
    Trophy,
    Users,
    User,
    ChevronRight,
    ChevronLeft,
    LogOut,
    Palette,
    Bell,
    CreditCard,
    Play,
    Zap
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuthStore } from '../../store/authStore';
import api from '../../services/api';

const NAV_ITEMS = [
    { label: 'Dashboard', icon: LayoutDashboard, href: '/dashboard' },
    { label: 'Map', icon: Map, href: '/map' },
    { label: 'Start Run', icon: Play, href: '/run' },
    { label: 'Leaderboard', icon: Trophy, href: '/leaderboard' },
    { label: 'Credits', icon: CreditCard, href: '/credits' },
    { label: 'Community', icon: Users, href: '/community' },
    { label: 'Faction', icon: Zap, href: '/faction' },
    { label: 'Alerts', icon: Bell, href: '/notifications', badge: 2 },
    { label: 'Profile', icon: User, href: '/profile' },
];

interface SidebarProps {
    collapsed: boolean;
    setCollapsed: (collapsed: boolean) => void;
}

export default function Sidebar({ collapsed, setCollapsed }: SidebarProps) {
    const pathname = usePathname();
    const { user } = useAuthStore();

    return (
        <aside
            className={`fixed left-0 top-0 bottom-0 bg-white border-r border-black/5 z-[55] flex flex-col transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${collapsed ? 'w-[60px]' : 'w-[220px]'}`}
        >
            {/* Logo Row */}
            <div className={`h-20 flex items-center px-4 gap-3 overflow-hidden ${collapsed ? 'justify-center' : ''}`}>
                <div
                    className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center font-black text-white"
                    style={{ background: 'linear-gradient(135deg, #A8D5BA, #6CC89A)' }}
                >
                    ⬡
                </div>
                {!collapsed && (
                    <span className="text-lg font-black tracking-tighter text-[#1a1a2e]">
                        Territory<span style={{ color: '#A8D5BA' }}>Run</span>
                    </span>
                )}
            </div>

            {/* Navigation Loop */}
            <nav className="flex-1 px-3 space-y-1 mt-4 overflow-y-auto overflow-x-hidden">
                {NAV_ITEMS.map((item) => {
                    const isActive = pathname === item.href;
                    const Icon = item.icon;

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            title={collapsed ? item.label : ''}
                            className={`
                                group relative flex items-center gap-3 p-3 transition-all duration-200 rounded-[14px]
                                ${isActive
                                    ? 'bg-[#F0F7F4] text-[#2E7D52]'
                                    : 'text-[#666] hover:bg-[#F4F7F4] hover:text-[#1a1a2e]'
                                }
                                ${collapsed ? 'justify-center' : ''}
                            `}
                        >
                            {isActive && !collapsed && (
                                <div className="absolute left-0 w-1 h-6 bg-[#A8D5BA] rounded-r-full" />
                            )}

                            <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />

                            {!collapsed && (
                                <span className={`text-[13px] tracking-tight ${isActive ? 'font-extrabold' : 'font-semibold'}`}>
                                    {item.label}
                                </span>
                            )}

                            {item.badge && (
                                <div className={`
                                    absolute bg-[#F4B8C1] text-[#c0392b] font-black rounded-full flex items-center justify-center
                                    ${collapsed ? 'top-2 right-2 w-4 h-4 text-[8px]' : 'right-3 w-4 h-4 text-[9px]'}
                                `}>
                                    {item.badge}
                                </div>
                            )}
                        </Link>
                    );
                })}
            </nav>

            {/* Bottom Section */}
            <div className="p-3 space-y-2 border-t border-black/5">
                {/* Collapse Toggle */}
                <button
                    onClick={() => setCollapsed(!collapsed)}
                    className="w-full flex items-center gap-3 p-3 text-[#666] hover:bg-[#F4F7F4] rounded-[14px] transition-all"
                    style={{ justifyContent: collapsed ? 'center' : 'flex-start' }}
                >
                    {collapsed ? <ChevronRight size={18} /> : (
                        <>
                            <ChevronLeft size={18} />
                            <span className="text-[12px] font-bold">Collapse</span>
                        </>
                    )}
                </button>

                {/* User Mini Profile */}
                <Link
                    href="/profile"
                    className={`flex items-center gap-2 p-2 rounded-[14px] border border-transparent hover:border-[#E8F4EE] hover:bg-[#F7FCF9] transition-all ${collapsed ? 'justify-center' : ''}`}
                >
                    <div
                        className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-black text-white"
                        style={{ background: 'linear-gradient(135deg, #A8D5BA, #6CC89A)' }}
                    >
                        {user?.username?.charAt(0).toUpperCase() || 'Y'}
                    </div>
                    {!collapsed && (
                        <div className="overflow-hidden">
                            <div className="text-[12px] font-extrabold text-[#1a1a2e] truncate">{user?.username || 'You'}</div>
                            <div className="text-[10px] font-black text-[#A8D5BA] tracking-widest uppercase truncate">TR-{user?.id?.slice(-4).toUpperCase() || 'D2R8'}</div>
                        </div>
                    )}
                </Link>

                {/* Logout Button */}
                <button
                    onClick={() => {
                        api.post('/auth/logout').finally(() => {
                            useAuthStore.getState().logout();
                            window.location.href = '/login';
                        });
                    }}
                    className={`w-full flex items-center gap-3 p-3 text-red-400 hover:bg-red-50 rounded-[14px] transition-all ${collapsed ? 'justify-center' : 'flex-start'}`}
                >
                    <LogOut size={18} />
                    {!collapsed && <span className="text-[12px] font-extrabold uppercase tracking-widest">Logout</span>}
                </button>
            </div>
        </aside>
    );
}
