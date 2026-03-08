'use client';

import React from 'react';
import { Radio, Hexagon, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

const C = {
    bg: '#F8FAF8',
    sage: '#A8D5BA',
    sageDark: '#6CC89A',
    ink: '#1A1A2E',
    muted: '#94A3B8',
};

export default function Loading() {
    return (
        <div
            className="min-h-screen flex flex-col items-center justify-center text-center p-6 relative overflow-hidden font-['Nunito']"
            style={{ backgroundColor: C.bg }}
        >
            {/* 1. Decorative Hex Grid Background (Subtle) */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none select-none">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] h-[150%] flex flex-wrap justify-center content-center gap-12 rotate-12">
                    {Array.from({ length: 48 }).map((_, i) => (
                        <Hexagon key={i} size={80} strokeWidth={1} className="text-[#A8D5BA]" />
                    ))}
                </div>
            </div>

            {/* 2. Primary Loading Animation: Soft Pulse */}
            <div className="relative mb-14">
                <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: [1, 1.8], opacity: [0.4, 0] }}
                    transition={{ duration: 2.5, repeat: Infinity, ease: "easeOut" }}
                    className="absolute inset-0 border-4 border-[#A8D5BA] rounded-[40px]"
                />
                <motion.div
                    animate={{ y: [0, -10, 0] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                    className="relative z-10 w-24 h-24 bg-white rounded-[32px] border border-black/5 shadow-2xl shadow-green-100 flex items-center justify-center text-[#A8D5BA]"
                >
                    <Radio size={48} className="animate-pulse" />
                </motion.div>

                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                    className="absolute -top-4 -right-4 w-10 h-10 bg-[#FFD6A5] rounded-xl flex items-center justify-center text-white shadow-lg"
                >
                    <Sparkles size={20} />
                </motion.div>
            </div>

            {/* 3. Typography: Syne Header */}
            <div className="space-y-6 relative z-20">
                <div className="space-y-2">
                    <h2 className="text-4xl font-extrabold font-['Syne'] tracking-tighter text-[#1A1A2E]">
                        Initializing <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#A8D5BA] to-[#6CC89A]">The Grid</span>
                    </h2>
                    <p className="text-sm font-bold text-slate-400 uppercase tracking-[0.2em]">
                        Preparing Tactical Comms Hub
                    </p>
                </div>

                {/* 4. Progress Indicator */}
                <div className="flex flex-col items-center gap-4">
                    <div className="w-48 h-1.5 bg-black/5 rounded-full relative overflow-hidden shadow-inner">
                        <motion.div
                            initial={{ x: '-100%' }}
                            animate={{ x: '100%' }}
                            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                            className="absolute inset-y-0 w-1/2 bg-gradient-to-r from-[#A8D5BA] to-[#6CC89A] rounded-full"
                        />
                    </div>

                    <div className="flex items-center gap-3 px-4 py-1.5 bg-white border border-black/5 rounded-full shadow-sm">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#A8D5BA] animate-pulse" />
                        <span className="text-[10px] font-black font-['Nunito'] text-gray-400 uppercase tracking-widest">
                            Syncing Intel Stream...
                        </span>
                    </div>
                </div>
            </div>

            {/* 5. Minimal Branded Footer */}
            <div className="absolute bottom-12 flex items-center gap-3 opacity-30 select-none">
                <Hexagon size={16} fill="#A8D5BA" className="text-[#A8D5BA]" />
                <span className="text-[9px] font-black uppercase tracking-[0.6em] text-[#1A1A2E]">TR_CORE_OS</span>
            </div>

            {/* 6. Context Skeleton Blocks */}
            <div className="absolute left-4 right-4 top-6 z-10 max-w-5xl mx-auto hidden md:block">
                <div className="grid grid-cols-4 gap-3 opacity-60">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="h-16 rounded-2xl bg-white/70 border border-black/5 animate-pulse" />
                    ))}
                </div>
            </div>
        </div>
    );
}