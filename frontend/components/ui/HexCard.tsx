'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Shield, Clock, Zap, MapPin, Swords, Terminal, Activity } from 'lucide-react';

// Design Tokens from Documentation
const COLORS = {
    deepNavy: '#0D0D1A',
    electricGreen: '#00C896',
    neonOrange: '#FF6B35',
    dangerRed: '#FF2244',
    ghostWhite: '#E8E8F0',
    mutedSlate: '#6B7280',
};

interface HexCardProps {
    hexId: string;
    owner?: {
        username: string;
        color: string;
    };
    credits: number;
    decay: number;
    lastActive?: string;
    size?: 'XS' | 'MD' | 'LG'; // Section 4.1 variants
}

export default function HexCard({ hexId, owner, credits, decay, lastActive, size = 'MD' }: HexCardProps) {
    const userColor = owner?.color || COLORS.mutedSlate;

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative font-['Inter'] group"
        >
            {/* 4.1 Hexagonal SVG Container - 80% opacity fill */}
            <div className="absolute inset-0 z-0 opacity-20 pointer-events-none overflow-hidden">
                <svg viewBox="0 0 100 100" className="w-full h-full">
                    <polygon 
                        points="50 1, 93 25, 93 75, 50 99, 7 75, 7 25" 
                        fill={userColor} 
                        className="transition-all duration-300 group-hover:fill-opacity-100" 
                        fillOpacity="0.8"
                    />
                </svg>
            </div>

            <div className={`
                relative z-10 bg-black/60 border-2 border-white/10 p-5 shadow-2xl overflow-hidden
                ${size === 'LG' ? 'w-80' : 'w-64'}
            `}>
                {/* Tactical Metadata Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2">
                        <Terminal size={12} className="text-[#00C896]" />
                        <span className="text-[9px] font-['JetBrains_Mono'] font-black uppercase tracking-widest text-[#6B7280]">
                            Sector_{hexId.slice(-4).toUpperCase()}
                        </span>
                    </div>
                    <div className="flex flex-col items-end">
                        <span className="text-[8px] font-black text-[#6B7280] uppercase mb-1">Integrity</span>
                        <div className="h-1 w-16 bg-white/5 overflow-hidden">
                            <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${decay * 100}%` }}
                                className={`h-full ${decay > 0.5 ? 'bg-[#00C896]' : 'bg-[#FF2244]'}`}
                            />
                        </div>
                    </div>
                </div>

                {/* 4.1 Ownership Display */}
                {owner ? (
                    <div className="flex items-center gap-4 mb-8">
                        <div 
                            className="w-12 h-12 border-2 flex items-center justify-center text-lg font-black font-['Space_Grotesk'] shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]"
                            style={{ borderColor: userColor, color: userColor, backgroundColor: `${userColor}10` }}
                        >
                            {owner.username.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <div className="flex items-center gap-1.5">
                                <div className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" style={{ color: userColor }} />
                                <span className="text-[10px] font-black text-[#6B7280] uppercase tracking-widest">Controlled_By</span>
                            </div>
                            <div className="text-lg font-black font-['Space_Grotesk'] text-[#E8E8F0] uppercase tracking-tight">
                                {owner.username}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center gap-4 mb-8 opacity-40">
                        <div className="w-12 h-12 border-2 border-dashed border-white/20 flex items-center justify-center text-[#6B7280]">
                            <Shield size={24} />
                        </div>
                        <div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-[#6B7280]">Status</span>
                            <div className="text-lg font-black font-['Space_Grotesk'] uppercase text-[#E8E8F0]">Neutral_Zone</div>
                        </div>
                    </div>
                )}

                {/* 3.0 Tactical Stats Grid - JetBrains Mono */}
                <div className="grid grid-cols-2 gap-px bg-white/10 border border-white/10 mb-6">
                    <div className="bg-black/40 p-3">
                        <div className="text-[8px] font-black text-[#6B7280] uppercase tracking-widest flex items-center gap-1 mb-1">
                            <Zap size={10} className="text-[#00C896]" /> Potential_Yield
                        </div>
                        <div className="font-['JetBrains_Mono'] font-bold text-sm text-[#00C896]">
                            {credits} <span className="text-[8px] opacity-60">TRC</span>
                        </div>
                    </div>
                    <div className="bg-black/40 p-3">
                        <div className="text-[8px] font-black text-[#6B7280] uppercase tracking-widest flex items-center gap-1 mb-1">
                            <Clock size={10} /> Last_Sync
                        </div>
                        <div className="font-['JetBrains_Mono'] font-bold text-[10px] text-[#E8E8F0] uppercase">
                            {lastActive ? '2M_AGO' : 'OFFLINE'}
                        </div>
                    </div>
                </div>

                {/* Section 4.1 On Hover Overlay: Invasion Count */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    <div className="bg-[#FF2244] text-[#0D0D1A] px-3 py-1 flex items-center gap-2 shadow-[0_0_20px_rgba(255,34,68,0.4)]">
                        <Swords size={12} />
                        <span className="text-[10px] font-black uppercase tracking-widest">Invasions: 12</span>
                    </div>
                </div>

                {/* Primary CTA: Aggressive Styling */}
                <button 
                    className={`
                        w-full py-4 font-black uppercase tracking-[0.2em] text-[10px] transition-all active:scale-[0.98] flex items-center justify-center gap-2
                        ${owner 
                            ? 'bg-transparent border border-[#FF2244] text-[#FF2244] hover:bg-[#FF2244] hover:text-[#0D0D1A]' 
                            : 'bg-[#00C896] text-[#0D0D1A] hover:bg-[#00FF88]'
                        }
                    `}
                >
                    {owner ? (
                        <>
                            <Swords size={14} />
                            Initiate_Invasion
                        </>
                    ) : (
                        <>
                            <Activity size={14} />
                            Establish_Sector
                        </>
                    )}
                </button>
            </div>
            
            {/* Background Scanner Accent */}
            <div className="absolute bottom-0 right-0 p-2 opacity-5 pointer-events-none group-hover:opacity-10 transition-opacity">
                <MapPin size={80} />
            </div>
        </motion.div>
    );
}