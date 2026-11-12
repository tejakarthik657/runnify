'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Zap,
  Compass,
  Plus,
  Moon,
  User,
  Radio
} from 'lucide-react';
import { useBunkStore } from '../../store/bunkStore';

export default function FloatingDock() {
  const pathname = usePathname();
  const { openCreateModal } = useBunkStore();

  const isPulse = pathname === '/' || pathname === '/pulse';
  const isDiscover = pathname === '/discover';
  const isAfterHours = pathname === '/after-hours';
  const isProfile = pathname === '/profile';

  return (
    <div className="fixed bottom-4 inset-x-0 z-40 flex justify-center pointer-events-none px-4">
      <nav className="pointer-events-auto h-[64px] w-full max-w-[420px] rounded-[32px] bg-[#12141C]/85 backdrop-blur-[24px] border border-white/[0.08] shadow-[0_20px_40px_rgba(0,0,0,0.6)] px-3 flex items-center justify-between">
        {/* Tab 1: The Pulse */}
        <Link
          href="/"
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-2xl transition-all ${
            isPulse ? 'text-[#CCFF00]' : 'text-[#828B9E] hover:text-[#CBD5E1]'
          }`}
        >
          <div className="relative">
            <Zap size={20} className={isPulse ? 'stroke-[2.5px] drop-shadow-[0_0_8px_rgba(204,255,0,0.4)]' : 'stroke-2'} />
            {isPulse && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-[#CCFF00]" />
            )}
          </div>
          <span className={`text-[10px] mt-0.5 tracking-tight font-semibold ${isPulse ? 'font-bold' : ''}`}>
            Pulse
          </span>
        </Link>

        {/* Tab 2: Discover */}
        <Link
          href="/discover"
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-2xl transition-all ${
            isDiscover ? 'text-[#8B5CF6]' : 'text-[#828B9E] hover:text-[#CBD5E1]'
          }`}
        >
          <div className="relative">
            <Compass size={20} className={isDiscover ? 'stroke-[2.5px] drop-shadow-[0_0_8px_rgba(139,92,246,0.4)]' : 'stroke-2'} />
            {isDiscover && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-[#8B5CF6]" />
            )}
          </div>
          <span className={`text-[10px] mt-0.5 tracking-tight font-semibold ${isDiscover ? 'font-bold' : ''}`}>
            Discover
          </span>
        </Link>

        {/* Tab 3: Create (Floating Elevated Center Button) */}
        <button
          onClick={openCreateModal}
          className="shrink-0 -mt-5 group focus:outline-none"
          title="Create Take or Pulse (< 15s)"
        >
          <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-[#8B5CF6] via-[#7C3AED] to-[#EC4899] text-white border-2 border-[#12141C] flex items-center justify-center shadow-[0_8px_24px_rgba(139,92,246,0.45)] transition-transform duration-200 active:scale-95 group-hover:scale-105">
            <Plus size={22} className="stroke-[2.5px]" />
          </div>
        </button>

        {/* Tab 4: After Hours */}
        <Link
          href="/after-hours"
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-2xl transition-all ${
            isAfterHours ? 'text-[#00F0FF]' : 'text-[#828B9E] hover:text-[#CBD5E1]'
          }`}
        >
          <div className="relative">
            <Moon size={20} className={isAfterHours ? 'stroke-[2.5px] drop-shadow-[0_0_8px_rgba(0,240,255,0.4)]' : 'stroke-2'} />
            {isAfterHours && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-[#00F0FF]" />
            )}
          </div>
          <span className={`text-[10px] mt-0.5 tracking-tight font-semibold ${isAfterHours ? 'font-bold' : ''}`}>
            After Hours
          </span>
        </Link>

        {/* Tab 5: Profile */}
        <Link
          href="/profile"
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-2xl transition-all ${
            isProfile ? 'text-[#8B5CF6]' : 'text-[#828B9E] hover:text-[#CBD5E1]'
          }`}
        >
          <div className="relative">
            <User size={20} className={isProfile ? 'stroke-[2.5px] drop-shadow-[0_0_8px_rgba(139,92,246,0.4)]' : 'stroke-2'} />
            {isProfile && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-[#8B5CF6]" />
            )}
          </div>
          <span className={`text-[10px] mt-0.5 tracking-tight font-semibold ${isProfile ? 'font-bold' : ''}`}>
            Profile
          </span>
        </Link>
      </nav>
    </div>
  );
}
