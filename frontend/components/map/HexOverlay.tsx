'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import HexCard from '../ui/HexCard';
import { X, Crosshair, Terminal, Zap } from 'lucide-react';

// Design Tokens from Documentation
const COLORS = {
    deepNavy: '#0D0D1A',
    electricGreen: '#00C896',
    ghostWhite: '#E8E8F0',
    mutedSlate: '#6B7280',
    dangerRed: '#FF2244',
};

interface HexOverlayProps {
    selectedHex: {
        id: string;
        owner?: {
            username: string;
            color: string;
        };
        credits: number;
        decay: number;
        lastActive?: string;
    } | null;
    onClose: () => void;
}

export default function HexOverlay({ selectedHex, onClose }: HexOverlayProps) {
    return (
        <AnimatePresence>
            {selectedHex && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 pointer-events-none font-['Inter']">
                    {/* 5.4 Map Layer Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-[#0D0D1A]/60 backdrop-blur-md pointer-events-auto"
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        transition={{ duration: 0.15 }} // 6.0 Motion Rule: <150ms
                        className="relative z-10 pointer-events-auto max-w-sm w-full"
                    >
                        {/* Tactical Metadata Header */}
                        <div className="flex justify-between items-end mb-3 px-1">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <Terminal size={12} className="text-[#00C896]" />
                                    <span className="text-[9px] font-black uppercase tracking-[0.3em] text-[#6B7280]">
                                        Sector_Analysis
                                    </span>
                                </div>
                                <h2 className="text-sm font-black font-['JetBrains_Mono'] text-white uppercase tracking-tighter">
                                    ID: {selectedHex.id.slice(0, 12)}
                                </h2>
                            </div>
                            
                            <button
                                onClick={onClose}
                                className="p-2 border border-white/10 bg-black hover:border-[#FF2244] hover:text-[#FF2244] transition-all group"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Primary Hex Display */}
                        <div className="relative group">
                            {/* Decorative Corner Brackets */}
                            <div className="absolute -top-2 -left-2 w-4 h-4 border-t-2 border-l-2 border-white/20" />
                            <div className="absolute -bottom-2 -right-2 w-4 h-4 border-b-2 border-r-2 border-white/20" />
                            
                            <HexCard
                                hexId={selectedHex.id}
                                owner={selectedHex.owner}
                                credits={selectedHex.credits}
                                decay={selectedHex.decay}
                                lastActive={selectedHex.lastActive}
                                size="LG" // 4.1 Featured variant
                            />
                        </div>

                        {/* Quick Action Footer (Section 5.4 Drawer Logic) */}
                        <div className="mt-6 grid grid-cols-2 gap-px bg-white/10 border border-white/10 shadow-2xl">
                            <button className="bg-black py-4 flex flex-col items-center justify-center gap-1 hover:bg-[#00C896] hover:text-[#0D0D1A] transition-all group">
                                <Crosshair size={16} className="text-[#00C896] group-hover:text-[#0D0D1A]" />
                                <span className="text-[9px] font-black uppercase tracking-widest">Mark_Target</span>
                            </button>
                            <button className="bg-black py-4 flex flex-col items-center justify-center gap-1 hover:bg-[#FF6B35] hover:text-[#0D0D1A] transition-all group">
                                <Zap size={16} className="text-[#FF6B35] group-hover:text-[#0D0D1A]" />
                                <span className="text-[9px] font-black uppercase tracking-widest">Simulate_Yield</span>
                            </button>
                        </div>
                        
                        {/* Status Readout */}
                        <div className="mt-4 text-center">
                            <p className="text-[8px] font-black text-[#6B7280] uppercase tracking-[0.4em]">
                                Data_Synchronized_via_Solana_Mainnet
                            </p>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}