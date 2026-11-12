'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Gamepad2,
  Zap,
  Trophy,
  Flame,
  CheckCircle2,
  RotateCcw,
  Sparkles,
  ArrowRight,
  HelpCircle,
  Clock
} from 'lucide-react';
import { useBunkStore } from '../../store/bunkStore';

interface WYRQuestion {
  id: string;
  optionA: string;
  optionB: string;
  votesA: number;
  votesB: number;
}

const WYR_QUESTIONS: WYRQuestion[] = [
  {
    id: 'wyr-1',
    optionA: 'Attend an 8:30 AM Mathematics lecture every single day for a year',
    optionB: 'Write 120 pages of handwritten lab records over one weekend',
    votesA: 34,
    votesB: 66
  },
  {
    id: 'wyr-2',
    optionA: 'Canteen food for every meal for the next 4 semesters',
    optionB: 'Mess food with guaranteed uninterrupted 1Gbps Wi-Fi in hostel room',
    votesA: 28,
    votesB: 72
  },
  {
    id: 'wyr-3',
    optionA: 'Accidentally reply-all to the entire college administration mailing list',
    optionB: 'Your search history projected on the seminar hall screen during guest lecture',
    votesA: 82,
    votesB: 18
  }
];

export default function ArcadePage() {
  const { user, updateUser } = useBunkStore();
  const [activeGame, setActiveGame] = useState<'wyr' | 'majority' | 'trivia'>('wyr');

  // WYR state
  const [wyrIndex, setWyrIndex] = useState(0);
  const [votedChoice, setVotedChoice] = useState<'A' | 'B' | null>(null);
  const [score, setScore] = useState(0);

  const currentWYR = WYR_QUESTIONS[wyrIndex];

  const handleVoteWYR = (choice: 'A' | 'B') => {
    if (votedChoice) return;
    setVotedChoice(choice);
    setScore((s) => s + 25);
    updateUser({ xp: user.xp + 25 });
  };

  const nextWYR = () => {
    setVotedChoice(null);
    setWyrIndex((prev) => (prev + 1) % WYR_QUESTIONS.length);
  };

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-violet-950/70 via-[#161226] to-fuchsia-950/70 border border-violet-500/25 p-6 md:p-8 backdrop-blur-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/20 border border-violet-500/30 text-violet-300 text-xs font-bold uppercase tracking-wider">
              <Gamepad2 size={14} />
              The BUNK Arcade • 60-Second Micro Games
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight">
              The Arcade <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-fuchsia-400">— Zero Fluff, Instant Play.</span>
            </h1>
            <p className="text-slate-300 text-sm md:text-base leading-relaxed">
              Quick campus micro-games for when your lecture gets canceled or during canteen breaks. No waiting rooms. No 10-person invites.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-black/40 border border-violet-500/20 text-center shrink-0 space-y-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block">
              Arcade Session Score
            </span>
            <span className="text-2xl font-black font-mono text-violet-300 flex items-center justify-center gap-1.5">
              <Zap size={20} className="text-amber-400 fill-amber-400" />
              {score} PTS
            </span>
            <span className="text-[10px] text-slate-400 block">+25 XP awarded per play</span>
          </div>
        </div>
      </div>

      {/* Game Mode Selector */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <button
          onClick={() => setActiveGame('wyr')}
          className={`p-4 rounded-2xl border text-left transition-all ${
            activeGame === 'wyr'
              ? 'border-violet-500 bg-violet-950/40 text-white shadow-lg shadow-violet-950/30'
              : 'border-white/5 bg-[#11131C] text-slate-400 hover:text-white'
          }`}
        >
          <span className="text-2xl block mb-1">⚖️</span>
          <h3 className="text-sm font-bold text-white">Would You Rather</h3>
          <p className="text-xs text-slate-400 mt-0.5">Campus dilemma showdowns</p>
        </button>

        <button
          onClick={() => setActiveGame('majority')}
          className={`p-4 rounded-2xl border text-left transition-all ${
            activeGame === 'majority'
              ? 'border-violet-500 bg-violet-950/40 text-white shadow-lg shadow-violet-950/30'
              : 'border-white/5 bg-[#11131C] text-slate-400 hover:text-white'
          }`}
        >
          <span className="text-2xl block mb-1">🧠</span>
          <h3 className="text-sm font-bold text-white">Guess the Majority</h3>
          <p className="text-xs text-slate-400 mt-0.5">Can you predict what campus voted?</p>
        </button>

        <button
          onClick={() => setActiveGame('trivia')}
          className={`p-4 rounded-2xl border text-left transition-all ${
            activeGame === 'trivia'
              ? 'border-violet-500 bg-violet-950/40 text-white shadow-lg shadow-violet-950/30'
              : 'border-white/5 bg-[#11131C] text-slate-400 hover:text-white'
          }`}
        >
          <span className="text-2xl block mb-1">⚡</span>
          <h3 className="text-sm font-bold text-white">Speed Campus Trivia</h3>
          <p className="text-xs text-slate-400 mt-0.5">Test your Warangal & B.Tech lore</p>
        </button>
      </div>

      {/* Main Game Stage */}
      {activeGame === 'wyr' && (
        <div className="max-w-2xl mx-auto rounded-3xl bg-[#11131C] border border-violet-500/25 p-6 md:p-8 space-y-6 shadow-2xl">
          <div className="flex items-center justify-between text-xs">
            <span className="font-mono text-violet-400 font-bold">
              QUESTION {wyrIndex + 1} OF {WYR_QUESTIONS.length}
            </span>
            <span className="text-slate-400">Campus Votes: 840+</span>
          </div>

          <h3 className="text-lg font-bold text-white text-center">
            Which fate would you choose?
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Option A */}
            <button
              onClick={() => handleVoteWYR('A')}
              className={`p-5 rounded-2xl border text-left transition-all relative overflow-hidden flex flex-col justify-between min-h-[160px] ${
                votedChoice === 'A'
                  ? 'border-violet-400 bg-violet-950/60 text-white shadow-lg shadow-violet-500/20'
                  : 'border-white/10 bg-white/[0.03] text-slate-200 hover:border-violet-500/40 hover:bg-white/[0.05]'
              }`}
            >
              {votedChoice && (
                <div
                  className="absolute inset-y-0 left-0 bg-violet-600/20 border-r border-violet-500/30 pointer-events-none transition-all duration-700"
                  style={{ width: `${currentWYR.votesA}%` }}
                />
              )}
              <span className="relative z-10 text-xs font-mono font-bold text-violet-400 mb-2">OPTION A</span>
              <p className="relative z-10 text-sm font-semibold leading-snug">{currentWYR.optionA}</p>
              {votedChoice && (
                <span className="relative z-10 text-lg font-black font-mono text-violet-300 mt-4">
                  {currentWYR.votesA}% Campus
                </span>
              )}
            </button>

            {/* Option B */}
            <button
              onClick={() => handleVoteWYR('B')}
              className={`p-5 rounded-2xl border text-left transition-all relative overflow-hidden flex flex-col justify-between min-h-[160px] ${
                votedChoice === 'B'
                  ? 'border-fuchsia-400 bg-fuchsia-950/60 text-white shadow-lg shadow-fuchsia-500/20'
                  : 'border-white/10 bg-white/[0.03] text-slate-200 hover:border-fuchsia-500/40 hover:bg-white/[0.05]'
              }`}
            >
              {votedChoice && (
                <div
                  className="absolute inset-y-0 left-0 bg-fuchsia-600/20 border-r border-fuchsia-500/30 pointer-events-none transition-all duration-700"
                  style={{ width: `${currentWYR.votesB}%` }}
                />
              )}
              <span className="relative z-10 text-xs font-mono font-bold text-fuchsia-400 mb-2">OPTION B</span>
              <p className="relative z-10 text-sm font-semibold leading-snug">{currentWYR.optionB}</p>
              {votedChoice && (
                <span className="relative z-10 text-lg font-black font-mono text-fuchsia-300 mt-4">
                  {currentWYR.votesB}% Campus
                </span>
              )}
            </button>
          </div>

          {votedChoice && (
            <div className="pt-2 text-center">
              <button
                onClick={nextWYR}
                className="px-6 py-3 rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-bold text-xs shadow-lg shadow-violet-600/25 transition-all inline-flex items-center gap-2"
              >
                <span>Next Campus Dilemma</span>
                <ArrowRight size={14} />
              </button>
            </div>
          )}
        </div>
      )}

      {activeGame !== 'wyr' && (
        <div className="max-w-md mx-auto rounded-3xl bg-[#11131C] border border-white/10 p-8 text-center space-y-4">
          <span className="text-4xl">🎲</span>
          <h3 className="text-base font-bold text-white">Daily Rotation Mode</h3>
          <p className="text-xs text-slate-400">
            This mode is in active beta rotation with new live multiplayer rooms dropping at 9 PM tonight!
          </p>
          <button
            onClick={() => setActiveGame('wyr')}
            className="px-4 py-2 rounded-xl bg-white/[0.05] text-xs font-bold text-white hover:bg-white/[0.1] transition-colors"
          >
            Play Would You Rather
          </button>
        </div>
      )}
    </div>
  );
}

