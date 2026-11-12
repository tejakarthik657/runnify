'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Bell,
  Flame,
  Search,
  Users,
  Shield,
  CheckCheck,
  Sparkles,
  ArrowRight,
  Clock
} from 'lucide-react';
import Link from 'next/link';

interface CampusAlert {
  id: string;
  type: 'buzz' | 'mystery' | 'connect' | 'battle';
  title: string;
  desc: string;
  timeAgo: string;
  link: string;
  isRead: boolean;
}

const INITIAL_ALERTS: CampusAlert[] = [
  {
    id: 'a-1',
    type: 'buzz',
    title: 'Hot Take Trending on Campus',
    desc: 'Your confession about 85% competitive coders reached 380+ upvotes & 68 replies.',
    timeAgo: '15m ago',
    link: '/',
    isRead: false
  },
  {
    id: 'a-2',
    type: 'mystery',
    title: 'New Clue Decrypted in Episode 001',
    desc: 'The Rot-13 fragment has been cracked by 42 students. 1 clue remaining until reveal.',
    timeAgo: '1h ago',
    link: '/mystery',
    isRead: false
  },
  {
    id: 'a-3',
    type: 'battle',
    title: 'KITSW Clout Lead Extended',
    desc: 'KITSW Warangal leads NIT Warangal 16,840 to 16,120 in the Cross-Campus Pulse challenge.',
    timeAgo: '2h ago',
    link: '/squads',
    isRead: true
  },
  {
    id: 'a-4',
    type: 'connect',
    title: 'Blind Connect Vibe Match',
    desc: 'A verified ECE student with shared interests in robotics and indie music is in queue.',
    timeAgo: '3h ago',
    link: '/connect',
    isRead: true
  }
];

export default function NotificationsPage() {
  const [alerts, setAlerts] = useState<CampusAlert[]>(INITIAL_ALERTS);

  const markAllRead = () => {
    setAlerts((prev) => prev.map((a) => ({ ...a, isRead: true })));
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between pb-4 border-b border-white/5">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2.5">
            <Bell size={22} className="text-violet-400" />
            Campus Radar & Alerts
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">Real-time notifications across your campus nodes.</p>
        </div>

        <button
          onClick={markAllRead}
          className="px-3.5 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-xs font-semibold text-slate-300 transition-colors flex items-center gap-1.5 border border-white/5"
        >
          <CheckCheck size={14} />
          <span>Mark All Read</span>
        </button>
      </div>

      <div className="space-y-3">
        {alerts.map((alert) => (
          <Link
            key={alert.id}
            href={alert.link}
            className={`block p-4 rounded-2xl border transition-all hover:border-violet-500/30 ${
              alert.isRead
                ? 'bg-[#11131C] border-white/5 text-slate-400'
                : 'bg-[#141724] border-violet-500/20 text-slate-200 shadow-md shadow-violet-950/20'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <span className="p-2 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-400 shrink-0 mt-0.5">
                  {alert.type === 'buzz' && <Flame size={16} />}
                  {alert.type === 'mystery' && <Search size={16} />}
                  {alert.type === 'battle' && <Shield size={16} />}
                  {alert.type === 'connect' && <Users size={16} />}
                </span>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    {alert.title}
                    {!alert.isRead && (
                      <span className="w-2 h-2 rounded-full bg-violet-400 inline-block" />
                    )}
                  </h3>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">{alert.desc}</p>
                </div>
              </div>

              <span className="text-[10px] text-slate-500 font-mono shrink-0 flex items-center gap-1">
                <Clock size={11} />
                {alert.timeAgo}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
