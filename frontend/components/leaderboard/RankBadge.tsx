'use client';

import React from 'react';
import { motion } from 'framer-motion';

// Design Tokens from Documentation
const COLORS = {
    deepNavy: '#0D0D1A',
    electricGreen: '#00C896',
    ghostWhite: '#E8E8F0',
    mutedSlate: '#6B7280',
    amberGold: '#FFB300',
    silver: '#E8E8F0',
    bronze: '#FF6B35'
};

interface RankBadgeProps {
    rank: number;
    size?: 'sm' | 'md' | 'lg';
}

export default function RankBadge({ rank, size = 'md' }: RankBadgeProps) {
    // 4.3 RankBadge Ring Logic
    const getRingStyles = () => {
        if (rank >= 1 && rank <= 3) {
            const gradients = {
                1: 'from-[#FFB300] to-[#E8E8F0]', // Gold/Prestige
                2: 'from-[#E8E8F0] to-[#6B7280]', // Silver
                3: 'from-[#FF6B35] to-[#0D0D1A]', // Bronze/Neon Orange
            };
            return `border-2 bg-gradient-to-tr ${gradients[rank as 1 | 2 | 3]} shadow-[0_0_15px_rgba(255,179,0,0.2)]`;
        }
        if (rank <= 10) return `border-2 border-[#00C896] bg-[#00C896]/10`;
        if (rank <= 50) return `border border-[#6B7280] bg-white/5`;
        return `border-transparent`;
    };

    const getTextColor = () => {
        if (rank >= 1 && rank <= 3) return 'text-[#0D0D1A]';
        if (rank <= 10) return 'text-[#00C896]';
        return 'text-[#6B7280]';
    };

    const dimensions = {
        sm: 'w-8 h-8 text-[10px]',
        md: 'w-11 h-11 text-xs',
        lg: 'w-14 h-14 text-sm',
    };

    return (
        <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.2 }}
            className={`
                relative flex items-center justify-center 
                ${dimensions[size]} 
                ${getRingStyles()} 
                font-['Space_Grotesk'] font-black uppercase tracking-tighter
            `}
        >
            {/* Visual Flare for Top 3 */}
            {rank >= 1 && rank <= 3 && (
                <div className="absolute inset-0 bg-white/20 animate-pulse" />
            )}

            <span className={`relative z-10 ${getTextColor()}`}>
                {rank ? `#${rank}` : '---'}
            </span>

            {/* Corner Accent for Rank #1 (Prestige Signal) */}
            {rank === 1 && (
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-white rotate-45" />
            )}
        </motion.div>
    );
}