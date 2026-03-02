'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, MapPin, ChevronRight, X, Swords, Zap, Terminal } from 'lucide-react';

// Design Tokens from Documentation
const COLORS = {
    deepNavy: '#0D0D1A',
    dangerRed: '#FF2244',
    electricGreen: '#00C896',
    mutedSlate: '#6B7280',
    ghostWhite: '#E8E8F0',
};

interface InvasionAlertProps {
    data: {
        hexId: string;
        invader: string;
        color: string;
    } | null;
    onClose: () => void;
    onDefend: () => void;
}

export default function InvasionAlert({ data, onClose, onDefend }: InvasionAlertProps) {
    return (
        <AnimatePresence>
            {data && (
                <motion.div
                    // 6.0 Motion Rule: Pulse + Subtle Shake for Invasions
                    initial={{ opacity: 0, x: 20, scale: 0.95 }}
                    animate={{ 
                        opacity: 1, 
                        x: [0, -2, 2, -2, 2, 0], // Tactical shake effect
                        scale: 1 
                    }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.4 }}
                    className="fixed bottom-24 left-4 right-4 z-[100] md:left-auto md:right-8 md:bottom-8 md:w-96 font-['Inter']"
                >
                    {/* 2.1 Brand Palette: Danger Red Border & Glow */}
                    <div className="bg-[#FF2244] p-[1px] shadow-[0_0_30px_rgba(255,34,68,0.3)]">
                        
                        <div className="bg-[#0D0D1A] relative overflow-hidden">
                            {/* Animated Scanner Background */}
                            <motion.div 
                                animate={{ top: ['-100%', '200%'] }}
                                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                                className="absolute inset-x-0 h-10 bg-gradient-to-b from-transparent via-[#FF2244]/10 to-transparent z-0"
                            />

                            <div className="p-6 relative z-10">
                                {/* Header: Section 5.8 Alert Logic */}
                                <div className="flex items-start justify-between mb-6">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 bg-[#FF2244]/10 border border-[#FF2244] flex items-center justify-center text-[#FF2244]">
                                            <Swords size={24} className="animate-pulse" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <div className="h-1.5 w-1.5 rounded-full bg-[#FF2244] animate-ping" />
                                                <span className="text-[9px] font-black uppercase tracking-[0.3em] text-[#FF2244]">Priority_Alpha</span>
                                            </div>
                                            <h3 className="text-xl font-black font-['Space_Grotesk'] text-[#E8E8F0] uppercase tracking-tighter italic">
                                                Invasion_<span className="text-[#FF2244]">Detected</span>
                                            </h3>
                                        </div>
                                    </div>
                                    <button
                                        onClick={onClose}
                                        className="text-[#6B7280] hover:text-[#E8E8F0] transition-colors"
                                    >
                                        <X size={18} />
                                    </button>
                                </div>

                                {/* Intel Data Grid */}
                                <div className="border border-white/10 bg-black/40 mb-6 overflow-hidden">
                                    <div className="grid grid-cols-2 gap-px bg-white/10">
                                        <div className="bg-[#0D0D1A] p-3">
                                            <span className="text-[8px] font-black text-[#6B7280] uppercase tracking-widest block mb-1">Target_Sector</span>
                                            <div className="flex items-center gap-2 text-[11px] font-['JetBrains_Mono'] text-white">
                                                <MapPin size={10} className="text-[#FF2244]" />
                                                {data.hexId.toUpperCase()}
                                            </div>
                                        </div>
                                        <div className="bg-[#0D0D1A] p-3">
                                            <span className="text-[8px] font-black text-[#6B7280] uppercase tracking-widest block mb-1">Hostile_ID</span>
                                            <div className="flex items-center gap-2 text-[11px] font-bold text-white uppercase">
                                                <div className="w-2 h-2" style={{ backgroundColor: data.color }} />
                                                {data.invader}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="bg-[#FF2244]/5 p-2 text-center border-t border-white/10">
                                        <span className="text-[9px] font-black text-[#FF2244] uppercase tracking-[0.2em]">Loss_Probability: High</span>
                                    </div>
                                </div>

                                {/* Actions: Sharp & Aggressive CTA */}
                                <div className="flex flex-col gap-2">
                                    <button
                                        onClick={onDefend}
                                        className="group w-full py-4 bg-[#FF2244] text-[#0D0D1A] font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 hover:bg-[#FF4466] transition-all active:scale-[0.98]"
                                    >
                                        <Zap size={14} fill="currentColor" />
                                        Initialize_Counter_Op
                                        <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
                                    </button>
                                    <button
                                        onClick={onClose}
                                        className="w-full py-3 border border-white/10 text-[#6B7280] font-black uppercase tracking-widest text-[10px] hover:text-[#E8E8F0] hover:bg-white/5 transition-all"
                                    >
                                        // Dismiss_Intel
                                    </button>
                                </div>

                                {/* System Tag */}
                                <div className="mt-4 flex items-center justify-center gap-2 opacity-30">
                                    <Terminal size={10} className="text-[#6B7280]" />
                                    <span className="text-[8px] font-black uppercase tracking-[0.4em] text-[#6B7280]">TR_DEFENSE_PROTOCOL_V1</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}