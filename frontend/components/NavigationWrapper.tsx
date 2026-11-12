'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import BottomNav from './layout/BottomNav';
import Sidebar from './layout/Sidebar';
import { motion, AnimatePresence } from 'framer-motion';
import { useBunkStore } from '../store/bunkStore';
import { Bell, Flame, Shield, Sparkles, MapPin } from 'lucide-react';

const HIDE_NAV_ROUTES: string[] = ['/login', '/onboarding'];

export default function NavigationWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const shouldHideNav = HIDE_NAV_ROUTES.includes(pathname);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = React.useState(false);
  const { user, campusBattle } = useBunkStore();

  return (
    <div className="min-h-screen bg-[#0B0D13] text-slate-100 font-sans selection:bg-violet-600 selection:text-white">
      {!shouldHideNav && (
        <>
          {/* Desktop Collapsible Sidebar */}
          <div className="hidden lg:block">
            <Sidebar collapsed={isSidebarCollapsed} setCollapsed={setIsSidebarCollapsed} />
          </div>

          {/* Mobile Bottom Navigation */}
          <BottomNav />
        </>
      )}

      {/* Main Content Area */}
      <div
        className={`transition-all duration-300 ease-in-out min-h-screen flex flex-col ${
          !shouldHideNav ? `pb-20 lg:pb-0 ${isSidebarCollapsed ? 'lg:pl-[72px]' : 'lg:pl-[240px]'}` : ''
        }`}
      >
        {/* Top Header Bar for Desktop and Mobile */}
        {!shouldHideNav && (
          <header className="sticky top-0 z-40 bg-[#0E1017]/85 backdrop-blur-md border-b border-white/5 px-4 md:px-8 py-3.5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/10 text-xs text-slate-300">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <MapPin size={13} className="text-violet-400" />
                <span className="font-semibold text-white">{user.collegeShort}</span>
                <span className="text-slate-500">•</span>
                <span className="text-slate-400">{user.branch} Campus Node</span>
              </div>

              {/* Campus Battle Mini Pill */}
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-950/40 border border-violet-500/20 text-xs">
                <Shield size={13} className="text-cyan-400" />
                <span className="text-cyan-300 font-bold">{campusBattle.homeCollege.split(' ')[0]}</span>
                <span className="text-slate-400 font-mono text-[11px]">{campusBattle.homeScore.toLocaleString()}</span>
                <span className="text-rose-400 font-bold text-[10px]">VS</span>
                <span className="text-rose-300 font-bold">{campusBattle.rivalCollege.split(' ')[0]}</span>
                <span className="text-slate-400 font-mono text-[11px]">{campusBattle.rivalScore.toLocaleString()}</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Daily Streak / XP Pill */}
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-bold">
                <Flame size={14} className="text-amber-400 fill-amber-400" />
                <span>{user.xp} XP</span>
              </div>

              <Link
                href="/profile"
                className="w-8 h-8 rounded-full bg-gradient-to-tr from-violet-600 to-indigo-600 border border-violet-400/30 flex items-center justify-center text-sm font-bold text-white shadow-md hover:scale-105 transition-transform"
              >
                {user.avatar}
              </Link>
            </div>
          </header>
        )}

        <main className="flex-1 p-3.5 sm:p-5 md:p-8 max-w-7xl w-full mx-auto">
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
      </div>
    </div>
  );
}
