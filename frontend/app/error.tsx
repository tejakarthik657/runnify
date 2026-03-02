'use client';

import React, { useEffect } from 'react';
import { AlertTriangle, RotateCcw, Home, ShieldAlert, Terminal, Activity } from 'lucide-react';
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

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        // Log to tactical console
        console.error(`[SYSTEM_CRITICAL]: ${error.message}`);
    }, [error]);

    return (
        <div 
            className="min-h-screen flex flex-col items-center justify-center text-center p-6 font-['Inter'] relative overflow-hidden" 
            style={{ backgroundColor: COLORS.deepNavy, color: COLORS.ghostWhite }}
        >
            {/* Background Glitch Overlay */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
                 style={{ backgroundImage: `radial-gradient(${COLORS.dangerRed} 1px, transparent 1px)`, backgroundSize: '24px 24px' }} />

            {/* Error Icon: Tactical Warning */}
            <div className="relative mb-8">
                <div className="w-24 h-24 border-2 border-[#FF2244] flex items-center justify-center text-[#FF2244] bg-[#FF2244]/10 shadow-[0_0_30px_rgba(255,34,68,0.2)]">
                    <ShieldAlert size={48} className="animate-pulse" />
                </div>
                <div className="absolute -top-2 -right-2 px-2 py-0.5 bg-[#FF2244] text-[#0D0D1A] text-[10px] font-black uppercase tracking-tighter">
                    Critical_Fail
                </div>
            </div>

            {/* Typography: Space Grotesk Headers */}
            <h1 className="text-4xl md:text-5xl font-black font-['Space_Grotesk'] uppercase tracking-tighter mb-4 italic">
                Uplink_<span style={{ color: COLORS.dangerRed }}>Severed</span>
            </h1>
            
            <p className="text-[#6B7280] max-w-md mx-auto mb-10 text-sm font-medium leading-relaxed uppercase tracking-tight">
                // System encountered a fatal exception during territory synchronization. <br/>
                All field data has been localized to prevent credit leakage.
            </p>

            {/* Action Buttons: Sharp & Aggressive */}
            <div className="flex flex-col sm:flex-row gap-4 relative z-10">
                <button
                    onClick={() => reset()}
                    className="px-10 py-4 bg-[#FF2244] text-[#0D0D1A] font-black uppercase tracking-widest text-xs hover:bg-[#FF4466] transition-all flex items-center justify-center gap-3 active:scale-95"
                >
                    <RotateCcw size={16} />
                    Re-establish_Link
                </button>
                <Link
                    href="/dashboard"
                    className="px-10 py-4 border-2 border-white/10 text-white font-black uppercase tracking-widest text-xs hover:bg-white/5 transition-all flex items-center justify-center gap-3 active:scale-95"
                >
                    <Home size={16} />
                    Return_to_HQ
                </Link>
            </div>

            {/* Technical Debug Footer: JetBrains Mono */}
            <div className="mt-16 max-w-xl w-full">
                <div className="flex items-center gap-2 mb-2 px-1">
                    <Terminal size={12} className="text-[#6B7280]" />
                    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[#6B7280]">Stack_Trace_Digest</span>
                </div>
                <div className="p-4 bg-black border border-white/10 text-left">
                    <p className="text-[10px] font-['JetBrains_Mono'] text-[#6B7280] break-all select-all leading-tight">
                        ERR_CODE: {error.digest || 'UNKNOWN_NULL_POINTER'}<br/>
                        TIMESTAMP: {new Date().toISOString().replace('T', '_').slice(0, 19)}<br/>
                        SECTOR: STABLE_DEPLOYMENT_V1
                    </p>
                </div>
            </div>
            
            {/* Corner Metadata */}
            <div className="absolute bottom-6 left-6 hidden lg:block">
                <div className="flex items-center gap-2 opacity-20">
                    <Activity size={14} className="text-[#FF2244]" />
                    <span className="text-[9px] font-black uppercase tracking-widest">Diagnostic_Mode: active</span>
                </div>
            </div>
        </div>
    );
}