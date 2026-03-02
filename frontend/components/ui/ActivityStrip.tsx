'use client';

import React from 'react';

interface ActivityStripProps {
    activities: {
        id: string;
        invader: { username: string; color?: string };
        victim: { username: string; color?: string };
        locationText: string;
        timeText: string;
    }[];
}

export default function ActivityStrip({ activities }: ActivityStripProps) {
    // Duplicate activities for seamless loop
    const displayActivities = [...activities, ...activities];

    return (
        <div className="bg-white/80 backdrop-blur-md border-b border-black/5 h-10 flex items-center overflow-hidden w-full relative z-40">
            <div className="flex items-center animate-ticker whitespace-nowrap">
                {displayActivities.map((act, i) => (
                    <div key={`${act.id}-${i}`} className="flex items-center gap-3 px-8 text-[10px] font-bold text-[#1a1a2e]">
                        <div
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: act.invader.color || '#A8D5BA' }}
                        />
                        <span className="font-black uppercase tracking-tight">{act.invader.username}</span>
                        <span className="text-gray-400 lowercase">invaded</span>
                        <span className="font-black uppercase tracking-tight" style={{ color: act.victim.color || '#F4B8C1' }}>
                            {act.victim.username}
                        </span>
                        <span className="text-gray-400 capitalize">
                            in {act.locationText} • {act.timeText}
                        </span>
                    </div>
                ))}
            </div>

            <style jsx>{`
                @keyframes ticker {
                    0% { transform: translateX(0); }
                    100% { transform: translateX(-50%); }
                }
                .animate-ticker {
                    animation: ticker 40s linear infinite;
                }
                .animate-ticker:hover {
                    animation-play-state: paused;
                }
            `}</style>
        </div>
    );
}
