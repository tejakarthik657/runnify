'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ChevronUp, ChevronDown, Zap } from 'lucide-react';

// Design Tokens from Documentation
const COLORS = {
    electricGreen: '#00C896',
    dangerRed: '#FF2244',
    ghostWhite: '#E8E8F0',
};

interface CreditDeltaProps {
    value: number;
    showIcon?: boolean;
}

export default function CreditDelta({ value, showIcon = true }: CreditDeltaProps) {
    if (value === 0) return null;

    const isPositive = value > 0;
    
    // 6.0 Motion Rule: Animations under 700ms. 
    // Positive: Slide-in from bottom. Negative: Pulse animation.
    const animationProps = isPositive 
        ? {
            initial: { opacity: 0, y: 15 },
            animate: { opacity: 1, y: 0 },
            transition: { type: 'spring', damping: 15, stiffness: 200 }
        }
        : {
            initial: { opacity: 0, scale: 1.1 },
            animate: { 
                opacity: 1, 
                scale: [1.1, 1, 1.05, 1], // Tactical pulse sequence
            },
            transition: { duration: 0.4 }
        };

    return (
        <motion.div
            {...animationProps}
            className="inline-flex items-center gap-2 font-['Inter']"
        >
            <div 
                className="flex items-center gap-1 px-2 py-0.5 border bg-black/40"
                style={{ 
                    color: isPositive ? COLORS.electricGreen : COLORS.dangerRed,
                    borderColor: isPositive ? `${COLORS.electricGreen}30` : `${COLORS.dangerRed}30`
                }}
            >
                {showIcon && (
                    isPositive ? <ChevronUp size={14} strokeWidth={3} /> : <ChevronDown size={14} strokeWidth={3} />
                )}
                
                {/* 3.0 Stat Number Style */}
                <span className="text-sm font-black font-['Space_Grotesk'] tracking-tighter uppercase italic">
                    {isPositive ? '+' : ''}{value}
                </span>

                {/* 3.0 Code / Hash Style */}
                <span className="text-[9px] font-['JetBrains_Mono'] font-bold opacity-60 ml-0.5 uppercase tracking-widest">
                    TRC
                </span>
            </div>

            {/* Tactical Glow Element */}
            {isPositive && (
                <div 
                    className="w-1 h-1 rounded-full animate-pulse" 
                    style={{ backgroundColor: COLORS.electricGreen, boxShadow: `0 0 8px ${COLORS.electricGreen}` }}
                />
            )}
        </motion.div>
    );
}