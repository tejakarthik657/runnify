'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Terminal, Activity, Satellite, CheckCircle2, Zap, ShieldAlert, Cpu } from 'lucide-react';

// Design Tokens from Documentation
const COLORS = {
    deepNavy: '#0D0D1A',
    electricGreen: '#00C896',
    neonOrange: '#FF6B35',
    ghostWhite: '#E8E8F0',
    mutedSlate: '#6B7280',
    dangerRed: '#FF2244',
};

interface GpsPoint {
    lat: number;
    lng: number;
    accuracy: number;
    timestamp: number;
}

interface GpsStreamProps {
    points: GpsPoint[];
    maxAccuracy?: number;
}

export default function GpsStream({ points, maxAccuracy = 50 }: GpsStreamProps) {
    const [isOpen, setIsOpen] = useState(false);
    const lastPoint = points[points.length - 1];
    
    // Determine signal status color based on precision
    const isLocked = lastPoint && lastPoint.accuracy <= maxAccuracy;
    const signalColor = isLocked ? COLORS.electricGreen : COLORS.neonOrange;

    return (
        <div className="fixed top-24 right-4 z-[40] font-['Inter']">
            <motion.div
                layout
                transition={{ duration: 0.15, ease: "easeOut" }} // 6.0 Motion Rule: <150ms
                className="bg-black/90 border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden"
                style={{ width: isOpen ? '280px' : '48px' }}
            >
                {/* Tactical Toggle Button */}
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="w-12 h-12 flex items-center justify-center transition-all hover:bg-white/5 group"
                    style={{ color: isOpen ? COLORS.electricGreen : COLORS.mutedSlate }}
                >
                    {isOpen ? <Cpu size={20} /> : <Terminal size={20} className="group-hover:scale-110" />}
                </button>

                <AnimatePresence>
                    {isOpen && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="p-5 border-t border-white/10"
                        >
                            {/* Header: System Status */}
                            <div className="flex items-center justify-between mb-5">
                                <div className="flex flex-col">
                                    <span className="text-[9px] font-black uppercase tracking-[0.3em] text-[#6B7280]">Telemetry_Link</span>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-[#E8E8F0] font-['Space_Grotesk']">Sat_Uplink_v2.4</span>
                                </div>
                                <div className="flex items-center gap-2 px-2 py-1 bg-white/5 border border-white/10">
                                    <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: signalColor }} />
                                    <span className="text-[8px] font-black uppercase tracking-tighter" style={{ color: signalColor }}>
                                        {isLocked ? 'SIGNAL_LOCKED' : 'LINK_DEGRADED'}
                                    </span>
                                </div>
                            </div>

                            {lastPoint ? (
                                <div className="space-y-5">
                                    {/* Precision Meter */}
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-widest">
                                            <span className="text-[#6B7280]">Horizontal_Precision</span>
                                            <span style={{ color: signalColor }}>
                                                {lastPoint.accuracy.toFixed(1)}M
                                            </span>
                                        </div>
                                        <div className="h-1 bg-white/5 relative overflow-hidden">
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: `${Math.max(5, 100 - (lastPoint.accuracy / maxAccuracy * 100))}%` }}
                                                className="h-full"
                                                style={{ backgroundColor: signalColor }}
                                            />
                                        </div>
                                    </div>

                                    {/* Coordinate Readout */}
                                    <div className="grid grid-cols-1 gap-px bg-white/10 border border-white/10">
                                        <div className="bg-black/40 p-3 flex items-center justify-between">
                                            <Satellite size={12} className="text-[#6B7280]" />
                                            <span className="text-[11px] font-['JetBrains_Mono'] text-[#E8E8F0] tracking-tighter">
                                                {lastPoint.lat.toFixed(6)} : {lastPoint.lng.toFixed(6)}
                                            </span>
                                        </div>
                                        <div className="bg-black/40 p-3 flex items-center justify-between">
                                            <Activity size={12} className="text-[#6B7280]" />
                                            <span className="text-[10px] font-['JetBrains_Mono'] text-[#6B7280]">
                                                {new Date(lastPoint.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Data Stream Log */}
                                    <div className="space-y-1.5 pt-2 border-t border-white/5">
                                        <div className="text-[8px] font-black uppercase tracking-[0.2em] text-[#6B7280] mb-2 flex items-center gap-2">
                                            <Zap size={10} /> Incoming_Packet_Buffer
                                        </div>
                                        <div className="max-h-24 overflow-y-auto space-y-1 scrollbar-hide">
                                            {points.slice(-4).reverse().map((p, i) => (
                                                <div key={p.timestamp} className="text-[9px] font-['JetBrains_Mono'] text-[#6B7280] flex items-center gap-3 opacity-60 hover:opacity-100 transition-opacity">
                                                    <span style={{ color: p.accuracy <= maxAccuracy ? COLORS.electricGreen : COLORS.neonOrange }}>
                                                        {p.accuracy <= maxAccuracy ? '●' : '▲'}
                                                    </span>
                                                    <span className="flex-1 truncate">DATA_CHUNK_{p.timestamp.toString().slice(-4)}</span>
                                                    <span>{p.accuracy.toFixed(0)}m</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center justify-center gap-2 opacity-20 pt-2">
                                        <ShieldAlert size={10} className="text-[#6B7280]" />
                                        <span className="text-[7px] font-black uppercase tracking-[0.4em] text-[#6B7280]">TR_ENCRYPTED_TELEMETRY</span>
                                    </div>
                                </div>
                            ) : (
                                <div className="py-12 text-center">
                                    <div className="inline-block animate-spin rounded-full h-4 w-4 border border-[#6B7280] border-t-transparent mb-3" />
                                    <p className="text-[9px] font-black uppercase tracking-[0.3em] text-[#6B7280]">Establishing_Fix...</p>
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </div>
    );
}