'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Shield,
  Trophy,
  Users,
  Flame,
  Award,
  Zap,
  Target,
  Sparkles,
  ArrowRight,
  PlusCircle,
  CheckCircle2
} from 'lucide-react';
import { useBunkStore, Squad } from '../../store/bunkStore';

export default function SquadsPage() {
  const { user, squads, campusBattle } = useBunkStore();
  const [selectedSquad, setSelectedSquad] = useState<Squad>(squads[0]);

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-cyan-950/70 via-[#101A24] to-indigo-950/70 border border-cyan-500/25 p-6 md:p-8 backdrop-blur-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 text-xs font-bold uppercase tracking-wider">
              <Shield size={14} />
              Squad Universe & Campus Warfare
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight">
              Squads & Campus Wars <span className="text-cyan-400">— Belong Together.</span>
            </h1>
            <p className="text-slate-300 text-sm md:text-base leading-relaxed">
              Form squads of 3–8 friends. Cooperate to crack campus mysteries, defend your college honor against rivals, and climb the campus prestige board.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-black/40 border border-cyan-500/20 text-center shrink-0 space-y-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block">
              Your Current Squad
            </span>
            <span className="text-lg font-black text-cyan-300 flex items-center justify-center gap-1.5">
              <span>👾</span>
              {user.squad}
            </span>
            <span className="text-[10px] text-emerald-400 block font-mono">Rank #2 • 1,890 Points</span>
          </div>
        </div>
      </div>

      {/* Campus War Banner: KITSW vs NIT Warangal */}
      <div className="rounded-3xl bg-[#11131C] border border-cyan-500/30 p-6 relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-4 mb-4">
          <div>
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-cyan-400 bg-cyan-500/10 px-2.5 py-1 rounded-full border border-cyan-500/20">
              CROSS-CAMPUS SHOWDOWN #04
            </span>
            <h3 className="text-lg font-black text-white mt-1">KITSW Warangal vs. NIT Warangal</h3>
            <p className="text-xs text-slate-400">Winning campus unlocks an exclusive campus-wide BUNK theme and mystery badge.</p>
          </div>

          <div className="flex items-center gap-6">
            <div className="text-center">
              <span className="text-xs font-bold text-cyan-400">KITSW (Host)</span>
              <p className="text-2xl font-black font-mono text-white">{campusBattle.homeScore.toLocaleString()}</p>
            </div>
            <span className="text-sm font-black text-rose-400">VS</span>
            <div className="text-center">
              <span className="text-xs font-bold text-slate-400">NIT Warangal</span>
              <p className="text-2xl font-black font-mono text-slate-300">{campusBattle.rivalScore.toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* Tug of war bar */}
        <div className="space-y-1.5">
          <div className="h-3 w-full bg-slate-800 rounded-full overflow-hidden flex">
            <div className="bg-gradient-to-r from-cyan-500 to-indigo-500 h-full" style={{ width: '52%' }} />
            <div className="bg-gradient-to-r from-rose-500 to-amber-500 h-full" style={{ width: '48%' }} />
          </div>
          <div className="flex justify-between text-[11px] text-slate-400 font-mono">
            <span className="text-cyan-400 font-bold">KITSW Lead (+720 pts)</span>
            <span>52% / 48% Clout Balance</span>
          </div>
        </div>
      </div>

      {/* Squads Leaderboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Squads List (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Trophy size={18} className="text-amber-400" />
              Campus Squad Leaderboards
            </h3>
            <span className="text-xs text-slate-400">Updated hourly</span>
          </div>

          <div className="space-y-2.5">
            {squads.map((sq, index) => {
              const isSelected = sq.id === selectedSquad.id;
              const isMySquad = sq.name === user.squad;

              return (
                <div
                  key={sq.id}
                  onClick={() => setSelectedSquad(sq)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-4 ${
                    isSelected
                      ? 'border-cyan-500/60 bg-cyan-950/20 text-white shadow-lg shadow-cyan-950/20'
                      : 'border-white/5 bg-[#11131C] text-slate-300 hover:border-white/10'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-7 h-7 rounded-xl flex items-center justify-center font-black text-xs font-mono ${
                        index === 0
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : index === 1
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                          : 'bg-white/5 text-slate-400'
                      }`}
                    >
                      #{index + 1}
                    </span>

                    <span className="text-2xl">{sq.avatar}</span>

                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-white">{sq.name}</h4>
                        {isMySquad && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                            YOUR SQUAD
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 italic mt-0.5">&ldquo;{sq.motto}&rdquo;</p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <p className="text-base font-black font-mono text-cyan-400">{sq.points.toLocaleString()}</p>
                    <span className="text-[10px] text-slate-400">{sq.membersCount} members</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Squad Details & Missions (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="rounded-3xl bg-[#11131C] border border-white/10 p-5 md:p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-white/5">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{selectedSquad.avatar}</span>
                <div>
                  <h4 className="text-base font-bold text-white">{selectedSquad.name}</h4>
                  <span className="text-xs text-cyan-400 font-semibold">{selectedSquad.college}</span>
                </div>
              </div>
              <span className="text-xs font-mono font-bold text-amber-400 px-2.5 py-1 rounded-xl bg-amber-500/10 border border-amber-500/20">
                {selectedSquad.topBadge}
              </span>
            </div>

            <p className="text-xs text-slate-300 italic">&ldquo;{selectedSquad.motto}&rdquo;</p>

            {/* Squad Stats */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/5 text-center">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Total Points</span>
                <span className="text-lg font-black font-mono text-cyan-300">{selectedSquad.points}</span>
              </div>
              <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/5 text-center">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Squad Rank</span>
                <span className="text-lg font-black font-mono text-amber-300">#{selectedSquad.rank}</span>
              </div>
            </div>

            {/* Active Squad Mission */}
            <div className="p-4 rounded-2xl bg-violet-950/30 border border-violet-500/20 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-violet-300 flex items-center gap-1.5">
                  <Target size={14} />
                  Active Squad Mission
                </span>
                <span className="text-[10px] text-amber-400 font-mono">+300 Squad XP</span>
              </div>
              <h5 className="text-xs font-bold text-white">Crack Episode 001 Final Key</h5>
              <p className="text-[11px] text-slate-300">
                Submit 2 verified theories to the Mystery Room before the 24H clock ticks out.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

