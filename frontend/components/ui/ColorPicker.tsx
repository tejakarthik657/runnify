'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Check, Hash, Terminal, Shield } from 'lucide-react';

// 2.2 Official Territory Player Colors
const TERRITORY_COLORS = [
    { name: 'Neon Green', hex: '#00FF88' },
    { name: 'Electric Blue', hex: '#0080FF' },
    { name: 'Crimson Red', hex: '#FF2244' },
    { name: 'Amber Gold', hex: '#FFB300' },
    { name: 'Magenta', hex: '#FF00AA' },
    { name: 'Cyan', hex: '#00DDFF' },
    { name: 'Deep Orange', hex: '#FF5500' },
    { name: 'Prestige White', hex: '#FFFFFF' }, // Section 2.2: City Rank #1 Unlock
];

interface ColorPickerProps {
    value: string;
    onChange: (color: string) => void;
    isRankOne?: boolean; // Logic for Section 2.2 unlock
}

export default function ColorPicker({ value, onChange, isRankOne = false }: ColorPickerProps) {
    return (
        <div className="space-y-6 font-['Inter']">
            {/* Header Readout */}
            <div className="flex items-center gap-2 mb-2 px-1">
                <Terminal size={12} className="text-[#6B7280]" />
                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[#6B7280]">
                    Select_Aura_Spectrum
                </span>
            </div>

            {/* Tactical Grid Selection */}
            <div className="grid grid-cols-4 gap-2 bg-black/40 border border-white/10 p-2">
                {TERRITORY_COLORS.map((color) => {
                    const isPrestige = color.hex === '#FFFFFF';
                    const isLocked = isPrestige && !isRankOne;

                    return (
                        <motion.button
                            key={color.hex}
                            whileHover={!isLocked ? { scale: 1.05 } : {}}
                            whileTap={!isLocked ? { scale: 0.95 } : {}}
                            onClick={() => !isLocked && onChange(color.hex)}
                            disabled={isLocked}
                            className={`relative aspect-square border-2 transition-all flex items-center justify-center ${
                                value === color.hex ? 'border-white z-10' : 'border-transparent'
                            } ${isLocked ? 'cursor-not-allowed opacity-20' : 'cursor-pointer hover:border-white/50'}`}
                            style={{ backgroundColor: color.hex }}
                        >
                            {/* 4.1 Visual Feedback - Sharp Markers */}
                            {value === color.hex && (
                                <div className="absolute inset-0 border-2 border-black/20 flex items-center justify-center">
                                    <Check size={20} className={isPrestige ? 'text-black' : 'text-white'} strokeWidth={3} />
                                </div>
                            )}

                            {isLocked && (
                                <Shield size={16} className="text-black" />
                            )}
                        </motion.button>
                    );
                })}
            </div>

            {/* 3.0 Manual Input - JetBrains Mono Readout */}
            <div className="relative group">
                <div className="absolute inset-0 bg-[#00C896] opacity-0 group-focus-within:opacity-10 transition-opacity blur-sm" />
                <div className="relative flex items-center gap-4 bg-black border border-white/10 p-4 group-focus-within:border-[#00C896] transition-all">
                    <div 
                        className="w-8 h-8 border border-white/20 shadow-[0_0_15px_rgba(255,255,255,0.05)] flex-shrink-0"
                        style={{ backgroundColor: value }}
                    />
                    <div className="flex-1 flex flex-col">
                        <span className="text-[8px] font-black text-[#6B7280] uppercase tracking-widest mb-1">Manual_Override</span>
                        <div className="flex items-center gap-2">
                            <Hash size={14} className="text-[#6B7280]" />
                            <input
                                type="text"
                                value={value.replace('#', '')}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    if (/^[A-Fa-f0-9]{0,6}$/.test(val)) {
                                        onChange(`#${val}`);
                                    }
                                }}
                                placeholder="00FF88"
                                className="bg-transparent border-none text-sm font-['JetBrains_Mono'] font-bold text-[#E8E8F0] focus:outline-none w-full uppercase tracking-tighter"
                            />
                        </div>
                    </div>
                    {/* Status Signal */}
                    <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#00C896] animate-pulse" />
                        <span className="text-[8px] font-black text-[#00C896] uppercase tracking-tighter">Active</span>
                    </div>
                </div>
            </div>

            {/* Prestige Warning Logic (Section 2.2) */}
            {!isRankOne && (
                <div className="mt-2 px-1">
                    <p className="text-[8px] font-bold text-[#6B7280] uppercase tracking-tight leading-relaxed italic">
                        // Prestige_White spectrum is restricted to City Rank #1 only.
                    </p>
                </div>
            )}
        </div>
    );
}