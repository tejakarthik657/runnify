'use client';

import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import FloatingDock from './layout/FloatingDock';
import CreateModal from './create/CreateModal';
import { motion, AnimatePresence } from 'framer-motion';
import { useBunkStore } from '../store/bunkStore';
import { Bell, ChevronDown, Check } from 'lucide-react';

const HIDE_NAV_ROUTES: string[] = ['/landing'];

export default function NavigationWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const shouldHideNav = HIDE_NAV_ROUTES.includes(pathname);
  const { user, activeCampus, availableCampuses, setActiveCampus } = useBunkStore();
  const [showCampusDropdown, setShowCampusDropdown] = useState(false);

  return (
    <div className="min-h-screen bg-[#0B0C10] text-[#F8FAFC] font-sans selection:bg-[#8B5CF6] selection:text-white">
      {/* Top Bar (Sticky, frosted) */}
      {!shouldHideNav && (
        <header className="sticky top-0 z-30 bg-[#0B0C10]/85 backdrop-blur-md border-b border-[#1F2330] px-4 md:px-8 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Wordmark: BUNK in Electric Violet with subtle glow */}
            <Link href="/" className="flex items-center gap-2 group">
              <span className="text-xl sm:text-2xl font-black tracking-tight text-[#8B5CF6] drop-shadow-[0_0_12px_rgba(139,92,246,0.4)] group-hover:scale-105 transition-transform">
                BUNK
              </span>
            </Link>

            {/* Campus Selector Pill Chip [KITSW ▾] */}
            <div className="relative">
              <button
                onClick={() => setShowCampusDropdown(!showCampusDropdown)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#161822] border border-[#2A2F42] hover:border-[#8B5CF6]/50 text-xs font-semibold text-[#CBD5E1] transition-all"
              >
                <span className="w-2 h-2 rounded-full bg-[#CCFF00] animate-pulse" />
                <span>{activeCampus}</span>
                <ChevronDown size={13} className="text-[#828B9E]" />
              </button>

              {/* Campus Dropdown */}
              <AnimatePresence>
                {showCampusDropdown && (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 6 }}
                    className="absolute left-0 mt-2 w-48 rounded-2xl bg-[#161822] border border-[#2A2F42] shadow-2xl p-1.5 z-50"
                  >
                    <span className="text-[10px] font-mono text-[#828B9E] px-2.5 py-1 block uppercase tracking-wider">
                      Switch Campus Node
                    </span>
                    {availableCampuses.map((campus) => (
                      <button
                        key={campus}
                        onClick={() => {
                          setActiveCampus(campus);
                          setShowCampusDropdown(false);
                        }}
                        className={`w-full text-left px-2.5 py-2 rounded-xl text-xs flex items-center justify-between transition-colors ${
                          activeCampus === campus
                            ? 'bg-[#8B5CF6]/15 text-[#8B5CF6] font-bold'
                            : 'text-[#CBD5E1] hover:bg-white/[0.04]'
                        }`}
                      >
                        <span>{campus}</span>
                        {activeCampus === campus && <Check size={13} />}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Action Icons */}
          <div className="flex items-center gap-3">
            {/* Notification Bell with green unread dot */}
            <Link
              href="/notifications"
              className="relative p-2 rounded-xl bg-[#161822] border border-[#1F2330] text-[#CBD5E1] hover:text-white hover:border-[#2A2F42] transition-colors"
              title="Campus Radar & Alerts"
            >
              <Bell size={17} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#CCFF00] ring-2 ring-[#0B0C10]" />
            </Link>

            {/* Avatar Badge with Glowing Violet/Lime border ring */}
            <Link
              href="/profile"
              className="flex items-center gap-2 p-1 pl-2.5 pr-1.5 rounded-full bg-[#161822] border border-[#8B5CF6]/40 hover:border-[#8B5CF6] transition-all"
            >
              <span className="text-xs font-bold text-white hidden sm:inline">{user.name.split(' ')[0]}</span>
              <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-[#8B5CF6] to-[#00F0FF] flex items-center justify-center text-xs text-white font-bold ring-1 ring-[#CCFF00]/60">
                {user.avatar}
              </div>
            </Link>
          </div>
        </header>
      )}

      {/* Main Content Area */}
      <main className={`max-w-7xl mx-auto px-4 sm:px-6 py-6 ${!shouldHideNav ? 'pb-28' : ''}`}>
        <AnimatePresence mode="wait">
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* 5-Tab Floating Glass Navigation Dock */}
      {!shouldHideNav && <FloatingDock />}

      {/* 15-Second Create Modal */}
      <CreateModal />
    </div>
  );
}
