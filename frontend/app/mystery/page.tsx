'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Search,
  Terminal,
  Lock,
  Unlock,
  Radio,
  Clock,
  ThumbsUp,
  Send,
  Sparkles,
  AlertTriangle,
  FileCode2,
  CheckCircle,
  HelpCircle,
  ShieldAlert
} from 'lucide-react';
import { useBunkStore } from '../../store/bunkStore';

export default function MysteryPage() {
  const { user, mystery, submitTheory, upvoteTheory } = useBunkStore();
  const [selectedClueId, setSelectedClueId] = useState<string>(mystery.clues[0]?.id || 'clue-1');
  const [myTheoryInput, setMyTheoryInput] = useState<string>('');
  const [cipherInput, setCipherInput] = useState<string>('GBHEANZRAG BS ABQRF');
  const [decodedCipher, setDecodedCipher] = useState<string>('');

  const activeClue = mystery.clues.find((c) => c.id === selectedClueId) || mystery.clues[0];

  const handleDecode = () => {
    // ROT13 decoder
    const res = cipherInput.replace(/[a-zA-Z]/g, (c) => {
      const base = c <= 'Z' ? 65 : 97;
      return String.fromCharCode(((c.charCodeAt(0) - base + 13) % 26) + base);
    });
    setDecodedCipher(res);
  };

  const handleTheorySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!myTheoryInput.trim()) return;
    submitTheory(myTheoryInput.trim());
    setMyTheoryInput('');
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-purple-950/80 via-[#131127] to-indigo-950/70 border border-purple-500/30 p-6 md:p-8 backdrop-blur-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 border border-purple-500/30 text-purple-300 text-xs font-mono font-bold uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-purple-400 animate-ping" />
              {mystery.episodeNumber} • 24H CAMPUS ARG
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight">
              {mystery.title}
            </h1>
            <p className="text-slate-300 text-sm md:text-base leading-relaxed">
              {mystery.subtitle} Investigate decrypted clues, solve campus ciphers with your squad, and vote on theories to unlock the next chapter.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-black/40 border border-purple-500/20 text-center shrink-0 space-y-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block">
              Time Until Expire
            </span>
            <span className="text-xl font-black font-mono text-amber-400 flex items-center justify-center gap-2">
              <Clock size={18} />
              {mystery.expiresIn}
            </span>
            <span className="text-[10px] text-purple-300 block">Reward: +100 XP & Mystery Badge</span>
          </div>
        </div>
      </div>

      {/* Mystery Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Clues & Decryption Lab (7 Cols) */}
        <div className="lg:col-span-7 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-white flex items-center gap-2">
              <Terminal size={18} className="text-purple-400" />
              Campus Node Clues ({mystery.clues.length})
            </h2>
            <span className="text-xs text-slate-400">
              {mystery.clues.filter((c) => c.isDiscovered).length} of {mystery.clues.length} Unlocked
            </span>
          </div>

          {/* Clue Selection Tabs */}
          <div className="grid grid-cols-3 gap-2.5">
            {mystery.clues.map((clue) => {
              const isSelected = clue.id === selectedClueId;

              return (
                <button
                  key={clue.id}
                  onClick={() => setSelectedClueId(clue.id)}
                  className={`p-3.5 rounded-2xl border text-left transition-all ${
                    isSelected
                      ? 'border-purple-500 bg-purple-950/40 text-white shadow-lg shadow-purple-900/20'
                      : 'border-white/5 bg-[#11131C] text-slate-400 hover:text-white hover:border-white/10'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-purple-400">
                      CLUE 0{clue.number}
                    </span>
                    {clue.isDiscovered ? (
                      <Unlock size={13} className="text-emerald-400" />
                    ) : (
                      <Lock size={13} className="text-amber-400" />
                    )}
                  </div>
                  <p className="text-xs font-bold truncate">{clue.title}</p>
                </button>
              );
            })}
          </div>

          {/* Active Clue Inspector */}
          {activeClue && (
            <div className="rounded-3xl bg-[#11131C] border border-white/10 p-5 md:p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <div>
                  <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-purple-500/20 text-purple-300">
                    TYPE: {activeClue.type}
                  </span>
                  <h3 className="text-base font-bold text-white mt-1.5">{activeClue.title}</h3>
                </div>
                <span className="text-xs font-mono text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle size={14} />
                  Verified Node
                </span>
              </div>

              {/* Clue Content Terminal Box */}
              <div className="p-4 rounded-2xl bg-black/60 border border-purple-500/20 font-mono text-xs sm:text-sm text-purple-200 leading-relaxed shadow-inner">
                <div className="flex items-center gap-1.5 text-slate-500 text-[10px] mb-2 pb-1 border-b border-white/5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80 inline-block" />
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80 inline-block" />
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 inline-block" />
                  <span className="ml-2">terminal://bunk-node.warangal/investigate</span>
                </div>
                {activeClue.content}
              </div>

              {/* Campus Field Hint */}
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-2.5 text-xs text-amber-200">
                <HelpCircle size={16} className="text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block text-amber-300">Field Scout Hint:</span>
                  {activeClue.hint}
                </div>
              </div>

              {/* Interactive ROT13 / Cipher Tool */}
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-3">
                <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <FileCode2 size={15} className="text-purple-400" />
                  Interactive Node Decryption Lab
                </span>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={cipherInput}
                    onChange={(e) => setCipherInput(e.target.value)}
                    placeholder="Enter cipher fragment..."
                    className="flex-1 rounded-xl bg-black/40 border border-white/10 px-3 py-2 text-xs font-mono text-purple-300 focus:outline-none focus:border-purple-500"
                  />
                  <button
                    onClick={handleDecode}
                    className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition-colors shrink-0"
                  >
                    Run ROT-13
                  </button>
                </div>
                {decodedCipher && (
                  <div className="p-2.5 rounded-xl bg-emerald-950/30 border border-emerald-500/30 text-emerald-300 font-mono text-xs">
                    Decrypted Output: <strong>{decodedCipher}</strong> (TOURNAMENT OF NODES)
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right: Submitted Theories & Campus Voting (5 Cols) */}
        <div className="lg:col-span-5 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-white flex items-center gap-2">
              <Sparkles size={18} className="text-amber-400" />
              Campus Theories ({mystery.theories.length})
            </h2>
            <span className="text-xs text-purple-400 font-bold">Top Voted Unlocks Next Episode</span>
          </div>

          {/* Submit Theory Input Card */}
          <div className="rounded-3xl bg-[#11131C] border border-purple-500/20 p-5 space-y-3">
            <h3 className="text-sm font-bold text-white">Submit Squad Theory</h3>
            <p className="text-xs text-slate-400">
              Think you solved the riddle? Pitch your theory to the campus. If voted #1, your squad gets 500 points!
            </p>

            <form onSubmit={handleTheorySubmit} className="space-y-3">
              <textarea
                rows={3}
                placeholder="What or who is the Midnight Transmission? Explain your proof..."
                value={myTheoryInput}
                onChange={(e) => setMyTheoryInput(e.target.value)}
                className="w-full rounded-2xl bg-black/40 border border-white/10 p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
              />
              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-purple-600/30 transition-all flex items-center justify-center gap-2"
              >
                <Send size={14} />
                <span>Submit Theory (+100 XP)</span>
              </button>
            </form>
          </div>

          {/* Theories Feed */}
          <div className="space-y-3">
            {mystery.theories.map((theory) => (
              <div
                key={theory.id}
                className="p-4 rounded-2xl bg-[#11131C] border border-white/5 space-y-2 hover:border-white/10 transition-all"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-purple-300">{theory.author}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-slate-400">
                      {theory.branch}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500">{theory.timeAgo}</span>
                </div>

                <p className="text-xs text-slate-200 leading-relaxed">{theory.theory}</p>

                <div className="flex items-center justify-between pt-2 border-t border-white/5">
                  <button
                    onClick={() => upvoteTheory(theory.id)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                      theory.userUpvoted
                        ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                        : 'bg-white/[0.03] text-slate-400 hover:text-white hover:bg-white/[0.08]'
                    }`}
                  >
                    <ThumbsUp size={13} className={theory.userUpvoted ? 'text-purple-400 fill-purple-400' : ''} />
                    <span>{theory.upvotes} Campus Votes</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

