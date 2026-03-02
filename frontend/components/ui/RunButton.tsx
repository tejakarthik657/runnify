'use client';

import React from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';

interface RunButtonProps {
    href: string;
    large?: boolean;
    label?: string;
    subLabel?: string;
    icon?: React.ReactNode;
}

export default function RunButton({ href, large = false, label = "Initialize Campaign", subLabel = "Deploy to grid", icon }: RunButtonProps) {
    return (
        <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={`
                relative overflow-hidden group cursor-pointer rounded-[32px]
                ${large ? 'p-8 min-h-[220px]' : 'p-6 min-h-[160px]'}
                flex flex-col justify-between shadow-[0_12px_32px_rgba(168,213,186,0.3)]
            `}
            style={{
                background: 'linear-gradient(135deg, #A8D5BA 0%, #6CC89A 100%)'
            }}
        >
            <Link href={href} className="absolute inset-0 z-10" />

            <div className="relative z-20">
                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-[#2E7D52] shadow-sm mb-4">
                    {icon || (
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polygon points="5 3 19 12 5 21 5 3"></polygon>
                        </svg>
                    )}
                </div>
                <h3 className={`${large ? 'text-3xl' : 'text-xl'} font-black text-white leading-tight mb-1`}>
                    {label}
                </h3>
                <p className="text-white/80 text-[11px] font-bold uppercase tracking-widest">
                    {subLabel}
                </p>
            </div>

            <div className="relative z-20 flex items-center gap-2 text-white font-black text-[10px] uppercase tracking-widest opacity-80 group-hover:opacity-100 transition-opacity">
                Quick Start <span className="text-lg">→</span>
            </div>

            {/* Decorative background shape */}
            <div className="absolute right-[-10%] bottom-[-10%] w-40 h-40 bg-white/10 rounded-full blur-3xl" />
        </motion.div>
    );
}
