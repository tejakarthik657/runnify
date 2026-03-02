'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface StatCardProps {
    label: string;
    value: string | number;
    subText?: string;
    icon?: React.ReactNode;
    color?: 'sage' | 'rose' | 'lavender' | 'peach' | 'blue';
    trend?: {
        value: string | number;
        isPositive: boolean;
    };
    loading?: boolean;
}

const COLOR_MAP = {
    sage: 'bg-[#A8D5BA]/10 text-[#2E7D52] border-[#A8D5BA]/20',
    rose: 'bg-[#F4B8C1]/10 text-[#E89BA5] border-[#F4B8C1]/20',
    lavender: 'bg-[#C3B1E1]/10 text-[#A594D3] border-[#C3B1E1]/20',
    peach: 'bg-[#FFD6A5]/10 text-[#E67E22] border-[#FFD6A5]/20',
    blue: 'bg-[#B5D5F5]/10 text-[#2980B9] border-[#B5D5F5]/20',
};

export default function StatCard({
    label,
    value,
    subText,
    icon,
    color = 'sage',
    trend,
    loading
}: StatCardProps) {
    const styleClasses = COLOR_MAP[color];

    return (
        <motion.div
            whileHover={{ y: -4 }}
            className={`
                bg-white p-5 rounded-[24px] border border-black/5 shadow-[0_4px_12px_rgba(0,0,0,0.02)]
                flex flex-col justify-between min-h-[140px] transition-all
            `}
        >
            <div className="flex items-center justify-between mb-4">
                <div className={`p-2 rounded-xl ${styleClasses.split(' ')[0]} ${styleClasses.split(' ')[1]}`}>
                    {icon}
                </div>
                {trend && (
                    <div className={`text-[10px] font-black px-2 py-0.5 rounded-full ${trend.isPositive ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                        {trend.isPositive ? '↑' : '↓'} {trend.value}
                    </div>
                )}
            </div>

            <div>
                <div className="text-[11px] font-black uppercase tracking-wider text-gray-400 mb-1">{label}</div>
                <div className="flex items-baseline gap-2">
                    <h2 className="text-2xl font-black tracking-tight text-[#1a1a2e]">
                        {loading ? <div className="h-8 w-16 bg-gray-100 animate-pulse rounded-lg" /> : value}
                    </h2>
                    {subText && !loading && (
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{subText}</span>
                    )}
                </div>
            </div>
        </motion.div>
    );
}
