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
            whileHover={{ y: -2 }}
            className={`
                nintendo-card p-4 rounded-xl flex flex-col justify-between min-h-[140px] transition-all
            `}
        >
            <div className="flex items-center justify-between mb-3">
                <div className="p-2 rounded-md btn-amber flex items-center justify-center">
                    {icon}
                </div>
                {trend && (
                    <div className={`text-[10px] font-black px-2 py-0.5 rounded-sm uppercase tracking-wider ${trend.isPositive ? 'bg-[#F68D1F] text-white' : 'bg-[#E60012] text-white'}`}>
                        {trend.isPositive ? '↑' : '↓'} {trend.value}
                    </div>
                )}
            </div>

            <div className="nintendo-row p-2.5 rounded-md">
                <div className="text-[10px] font-black uppercase tracking-wider text-[#3D4F97] mb-0.5">{label}</div>
                <div className="flex items-baseline gap-2">
                    <h2 className="text-2xl font-black tracking-tight text-[#21242E]">
                        {loading ? <div className="h-7 w-16 bg-[#C0D5E6] animate-pulse rounded" /> : value}
                    </h2>
                    {subText && !loading && (
                        <span className="text-[9px] font-bold text-[#60619C] uppercase tracking-widest">{subText}</span>
                    )}
                </div>
            </div>
        </motion.div>
    );
}
