'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Square, Timer, MapIcon, Zap, ChevronUp, ChevronDown, Crosshair, Radio, ShieldCheck } from 'lucide-react';

// Design Tokens from Documentation
const COLORS = {
    deepNavy: '#0D0D1A',
    electricGreen: '#00C896',
    neonOrange: '#FF6B35',
    ghostWhite: '#E8E8F0',
    mutedSlate: '#6B7280',
    dangerRed: '#FF2244',
};

interface RunTrackerProps {
    isActive: boolean;
    stats: {
        distanceKm: number;
        durationSeconds: number;
        hexCount: number;
        creditsEarned: number;
    };
    onStart: () => void;
    onStop: () => void;
}

export default function RunTracker({ isActive, stats, onStart, onStop }: RunTrackerProps) {
    const [isMinimized, setIsMinimized] = useState(false);

    const formatTime = (seconds: number) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        return [h, m, s].map(v => v < 10 ? '0' + v : v).filter((v, i) => v !== '00' || i > 0).join(':');
    };

    return (
        <div className="fixed bottom-24 left-4 right-4 z-50 md:left-8 md:bottom-8 md:w-85 font-['Inter']">
            <motion.div
                layout
                className="bg-black/90 border-2 border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden"
            >
                {/* 4.4 HUD Header / Minimize Toggle */}
                <div
                    onClick={() => setIsMinimized(!isMinimized)}
                    className="p-3 border-b border-white/10 flex items-center justify-between cursor-pointer hover:bg-white/5 transition-all"
                >
                    <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 ${isActive ? 'bg-[#FF2244] animate-pulse shadow-[0_0_8px_#FF2244]' : 'bg-[#6B7280]'}`} />
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#6B7280]">
                            {isActive ? 'Live_Sortie_Active' : 'Awaiting_Deployment'}
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-[8px] font-black text-white/20 uppercase tracking-widest">Toggle_HUD</span>
                        {isMinimized ? <ChevronUp size={12} className="text-[#6B7280]" /> : <ChevronDown size={12} className="text-[#6B7280]" />}
                    </div>
                </div>

                <AnimatePresence mode="wait">
                    {!isMinimized && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }} // 6.0 Motion Rule: Complete under 700ms
                            className="p-6 relative overflow-hidden"
                        >
                            {/* Static Scanner Background Effect */}
                            <div className="absolute inset-0 pointer-events-none opacity-[0.02] bg-[radial-gradient(#00C896_1px,transparent_1px)] [background-size:16px_16px]" />

                            {/* 3.0 Main Metrics in Space Grotesk */}
                            <div className="text-center mb-8 relative z-10">
                                <div className="text-6xl font-black text-white font-['Space_Grotesk'] tracking-tighter leading-none flex items-baseline justify-center gap-1">
                                    {stats.distanceKm.toFixed(2)}
                                    <span className="text-sm text-[#00C896] uppercase tracking-widest font-black">KM</span>
                                </div>
                                <div className="flex items-center justify-center gap-2 text-[#6B7280] font-['JetBrains_Mono'] text-xs mt-2 uppercase font-bold tracking-tighter">
                                    <Timer size={12} className="text-[#00C896]" />
                                    ELAPSED_TIME: {formatTime(stats.durationSeconds)}
                                </div>
                            </div>

                            {/* 4.4 KPI Drawer Grid */}
                            <div className="grid grid-cols-2 gap-px bg-white/10 border border-white/10 mb-8 relative z-10 shadow-2xl">
                                <div className="bg-black p-4">
                                    <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] text-[#6B7280] mb-2">
                                        <Crosshair size={12} className="text-[#00C896]" />
                                        Captured
                                    </div>
                                    <div className="text-2xl font-black font-['Space_Grotesk'] text-white">
                                        {stats.hexCount} <span className="text-[10px] font-bold text-[#6B7280]">HEX</span>
                                    </div>
                                </div>
                                <div className="bg-black p-4">
                                    <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] text-[#6B7280] mb-2">
                                        <Zap size={12} className="text-[#00C896]" />
                                        Yield
                                    </div>
                                    <div className="text-2xl font-black font-['Space_Grotesk'] text-[#00C896]">
                                        {stats.creditsEarned} <span className="text-[10px] font-bold text-[#6B7280]">TRC</span>
                                    </div>
                                </div>
                            </div>

                            {/* 5.3 Control Interface */}
                            <div className="relative z-10">
                                {!isActive ? (
                                    <button
                                        onClick={onStart}
                                        className="group w-full py-5 bg-[#00C896] hover:bg-[#00FF88] text-[#0D0D1A] font-black tracking-[0.2em] text-xs transition-all active:scale-[0.98] flex items-center justify-center gap-4"
                                    >
                                        <Radio size={18} className="group-hover:animate-pulse" />
                                        INITIALIZE_CAMPAIGN
                                    </button>
                                ) : (
                                    <button
                                        onClick={onStop}
                                        className="group w-full py-5 bg-[#FF2244] hover:bg-[#FF4466] text-white font-black tracking-[0.2em] text-xs transition-all active:scale-[0.98] flex items-center justify-center gap-4"
                                    >
                                        <ShieldCheck size={18} />
                                        TERMINATE_MISSION
                                    </button>
                                )}
                            </div>
                            
                            <div className="mt-4 flex items-center justify-center gap-2 opacity-20">
                                <span className="text-[7px] font-black text-[#E8E8F0] uppercase tracking-[0.5em]">System_Integrity_Verified_TR_77</span>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </div>
    );
}