'use client';

import React from 'react';
import { useAuthStore } from '../../store/authStore';
import { Bell, Search, Terminal, Crosshair, Cpu, Radio } from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';

// Design Tokens from Documentation
const COLORS = {
    deepNavy: '#0D0D1A',
    electricGreen: '#00C896',
    neonOrange: '#FF6B35',
    ghostWhite: '#E8E8F0',
    mutedSlate: '#6B7280',
    dangerRed: '#FF2244',
};

export default function Navbar() {
    const { user } = useAuthStore();

    return (
        <nav className="fixed top-0 left-0 right-0 z-[60] p-4 lg:p-6 pointer-events-none">
            <div className="max-w-[100%] mx-auto flex items-start justify-between pointer-events-auto">
                
                {/* 1. Left Section: System Identity (Section 5.1 Style) */}
                <Link href="/dashboard" className="group">
                    <div className="flex items-center gap-0 border border-white/10 bg-black/60 backdrop-blur-md overflow-hidden hover:border-[#00C896] transition-all">
                        <div className="w-12 h-12 bg-[#00C896]/10 border-r border-white/10 flex items-center justify-center text-[#00C896] group-hover:bg-[#00C896] group-hover:text-[#0D0D1A] transition-all">
                            <Cpu size={22} />
                        </div>
                        <div className="px-4 py-2">
                            <div className="flex items-center gap-2">
                                <div className="h-1.5 w-1.5 rounded-full bg-[#00C896] animate-pulse" />
                                <span className="text-[9px] font-black text-[#6B7280] uppercase tracking-[0.3em] leading-none">Node_Active</span>
                            </div>
                            <h1 className="font-['Space_Grotesk'] font-black text-sm tracking-tighter text-[#E8E8F0] uppercase mt-0.5">
                                Territory<span className="text-[#00C896]">Run</span>
                            </h1>
                        </div>
                    </div>
                    {/* Secondary metadata readout */}
                    <div className="mt-1 px-1 flex gap-3 text-[8px] font-black text-[#6B7280] uppercase tracking-widest opacity-60">
                        <span>v1.0.4_Stable</span>
                        <span className="text-[#00C896]">Encrypted_Link</span>
                    </div>
                </Link>

                {/* 2. Right Section: Combatant HUD (Section 5.3 Style) */}
                <div className="flex items-start gap-3">
                    
                    {/* Tactical Icons Bar */}
                    <div className="flex items-center bg-black/60 border border-white/10 backdrop-blur-md">
                        <NavIconButton icon={<Search size={16} />} />
                        <div className="w-[1px] h-6 bg-white/5" />
                        <NavIconButton 
                            icon={<Bell size={16} />} 
                            badge={<span className="absolute top-2.5 right-2.5 w-1.5 h-1.5 bg-[#FF2244] animate-pulse shadow-[0_0_8px_#FF2244]" />} 
                        />
                        <div className="w-[1px] h-6 bg-white/5" />
                        <NavIconButton icon={<Radio size={16} />} color={COLORS.neonOrange} />
                    </div>

                    {/* Combatant Profile Block */}
                    <Link href="/profile" className="flex items-stretch border border-white/10 bg-black/60 backdrop-blur-md hover:border-[#00C896] transition-all group">
                        <div className="px-4 py-2 text-right flex flex-col justify-center border-r border-white/5">
                            <div className="text-[10px] font-black text-[#E8E8F0] uppercase tracking-wider group-hover:text-[#00C896] transition-colors">
                                {user?.username || 'GUEST_USER'}
                            </div>
                            <div className="flex items-center justify-end gap-1.5 text-[9px] font-['JetBrains_Mono'] text-[#00C896] font-bold mt-0.5">
                                <Crosshair size={10} /> 
                                <span>{user?.credits?.toLocaleString() || 0} TRC</span>
                            </div>
                        </div>
                        
                        {/* 4.3 RankBadge Minimal Variant */}
                        <div className="p-2.5 flex items-center justify-center">
                            {user?.avatarUrl ? (
                                <div className="w-10 h-10 border-2 overflow-hidden shadow-[inset_0_0_10px_rgba(0,0,0,0.5)] transition-transform group-active:scale-95" style={{ borderColor: user?.color || COLORS.electricGreen }}>
                                    <img src={user.avatarUrl} alt={user.username} className="w-full h-full object-cover" />
                                </div>
                            ) : (
                                <div 
                                    className="w-10 h-10 border-2 flex items-center justify-center text-xs font-black shadow-[inset_0_0_10px_rgba(0,0,0,0.5)] transition-transform group-active:scale-95"
                                    style={{ 
                                        borderColor: user?.color || COLORS.electricGreen, 
                                        color: user?.color || COLORS.electricGreen, 
                                        backgroundColor: `${user?.color}10` 
                                    }}
                                >
                                    {user?.username?.charAt(0).toUpperCase() || '?'}
                                </div>
                            )}
                        </div>
                    </Link>
                </div>
            </div>
        </nav>
    );
}

function NavIconButton({ icon, badge, color }: { icon: React.ReactNode, badge?: React.ReactNode, color?: string }) {
    return (
        <button 
            className="p-3.5 relative transition-all hover:bg-white/5 group"
            style={{ color: color || COLORS.mutedSlate }}
        >
            <div className="group-hover:text-[#E8E8F0] group-hover:scale-110 transition-all">
                {icon}
            </div>
            {badge}
        </button>
    );
}