'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Sparkles,
  Radio,
  Search,
  Users,
  Moon,
  Shield,
  ArrowRight,
  Flame,
  CheckCircle2,
  Lock,
  MessageCircle
} from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#08090E] text-white flex flex-col justify-between selection:bg-violet-600 selection:text-white">
      {/* Background glow effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-tr from-violet-600/15 via-fuchsia-600/10 to-transparent rounded-full blur-[120px]" />
        <div className="absolute bottom-10 left-10 w-[400px] h-[400px] bg-cyan-600/10 rounded-full blur-[100px]" />
      </div>

      {/* Top Navbar */}
      <nav className="relative z-20 max-w-6xl w-full mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-violet-600 via-indigo-600 to-fuchsia-500 flex items-center justify-center font-black text-xl shadow-lg shadow-violet-600/30">
            B
          </div>
          <span className="font-black text-xl tracking-wider">BUNK</span>
        </div>

        <Link
          href="/"
          className="px-5 py-2.5 rounded-2xl bg-white/[0.06] hover:bg-white/[0.1] border border-white/10 text-xs font-bold text-white transition-all backdrop-blur-md flex items-center gap-2"
        >
          <span>Open Campus App</span>
          <ArrowRight size={14} />
        </Link>
      </nav>

      {/* Hero Content */}
      <main className="relative z-10 max-w-5xl mx-auto px-6 py-12 md:py-20 text-center space-y-8">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/30 text-violet-300 text-xs font-bold uppercase tracking-widest">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          The Parallel Social Universe For College Students
        </div>

        <h1 className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tight leading-[1.08]">
          Escape the routine. <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 via-fuchsia-400 to-cyan-400">
            Enter your world.
          </span>
        </h1>

        <p className="max-w-2xl mx-auto text-slate-300 text-base sm:text-lg leading-relaxed font-normal">
          Not another educational portal. Not an endless photo feed. BUNK is a live campus universe where daily mysteries, spontaneous pulse debates, and anonymous connections bring student life alive.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <Link
            href="/"
            className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-violet-600 via-indigo-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-extrabold text-sm shadow-xl shadow-violet-600/40 transition-all active:scale-95 flex items-center justify-center gap-2.5"
          >
            <span>Enter BUNK Campus World</span>
            <ArrowRight size={16} />
          </Link>

          <Link
            href="/connect"
            className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-white font-bold text-sm transition-all flex items-center justify-center gap-2"
          >
            <Users size={16} className="text-emerald-400" />
            <span>Try Blind Connect</span>
          </Link>
        </div>

        {/* Feature Cards Showcase */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-12 text-left">
          <div className="p-6 rounded-3xl bg-[#11131C]/90 border border-white/5 space-y-3 backdrop-blur-md">
            <div className="w-10 h-10 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center">
              <Radio size={20} />
            </div>
            <h3 className="text-base font-bold text-white">The Campus Pulse</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Unfiltered anonymous confessions, canteen culture lore, and daily social experiments with real-time branch breakdowns.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-[#11131C]/90 border border-white/5 space-y-3 backdrop-blur-md">
            <div className="w-10 h-10 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center">
              <Search size={20} />
            </div>
            <h3 className="text-base font-bold text-white">The Mystery Engine</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Collaborative 24-hour campus enigmas. Decode packet headers, crack terminal ciphers with your squad, and vote on theories.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-[#11131C]/90 border border-white/5 space-y-3 backdrop-blur-md">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Users size={20} />
            </div>
            <h3 className="text-base font-bold text-white">Blind Connect</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Meet fellow verified students based on pure vibe without the awkward intro. Chat anonymously and mutually reveal identities.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 py-6 px-6 text-center text-xs text-slate-500">
        <p>BUNK Campus Universe • Kakatiya Institute of Technology & Science (KITSW) & Warangal Node</p>
      </footer>
    </div>
  );
}
