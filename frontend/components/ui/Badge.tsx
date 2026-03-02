'use client';

import React from 'react';

interface BadgeProps {
    children: React.ReactNode;
    variant?: 'sage' | 'rose' | 'lavender' | 'peach' | 'blue' | 'gray';
    size?: 'sm' | 'md';
    pulse?: boolean;
    className?: string;
}

const VARIANTS = {
    sage: 'bg-[#A8D5BA]/20 text-[#2E7D52]',
    rose: 'bg-[#F4B8C1]/20 text-[#c0392b]',
    lavender: 'bg-[#C3B1E1]/20 text-[#A594D3]',
    peach: 'bg-[#FFD6A5]/20 text-[#E67E22]',
    blue: 'bg-[#B5D5F5]/20 text-[#2980B9]',
    gray: 'bg-gray-100 text-gray-500',
};

export default function Badge({
    children,
    variant = 'sage',
    size = 'md',
    pulse = false,
    className = ''
}: BadgeProps) {
    return (
        <span className={`
            inline-flex items-center gap-1.5 font-black uppercase tracking-widest rounded-full
            ${VARIANTS[variant]}
            ${size === 'sm' ? 'px-2 py-0.5 text-[8px]' : 'px-3 py-1 text-[10px]'}
            ${pulse ? 'animate-pulse' : ''}
            ${className}
        `}>
            {pulse && (
                <span className={`w-1.5 h-1.5 rounded-full bg-current`} />
            )}
            {children}
        </span>
    );
}
