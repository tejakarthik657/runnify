'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Radio,
  Flame,
  Skull,
  Coffee,
  MessageSquare,
  Share2,
  Sparkles,
  TrendingUp,
  Search,
  Users,
  Compass,
  PlusCircle,
  BarChart2,
  AlertCircle,
  Send,
  X,
  CheckCircle2,
  Shield,
  Zap,
  ArrowRight
} from 'lucide-react';
import { useBunkStore, PulsePost } from '../store/bunkStore';

export default function HomePage() {
  const {
    user,
    pulseFeed,
    currentPoll,
    mystery,
    reactToPost,
    addPulsePost,
    addComment,
    votePoll,
    campusBattle
  } = useBunkStore();

  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [showPostModal, setShowPostModal] = useState<boolean>(false);
  const [newContent, setNewContent] = useState<string>('');
  const [newCategory, setNewCategory] = useState<PulsePost['category']>('Campus Buzz');
  const [isAnonymous, setIsAnonymous] = useState<boolean>(true);

  // Active comments open post id
  const [activeCommentPostId, setActiveCommentPostId] = useState<string | null>(null);
  const [commentInput, setCommentInput] = useState<string>('');

  const categories = ['All', 'Campus Buzz', 'Confession', 'Unpopular Opinion', 'Hot Take'];

  const filteredPosts = selectedCategory === 'All'
    ? pulseFeed
    : pulseFeed.filter((p) => p.category === selectedCategory);

  const handleCreatePost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContent.trim()) return;
    addPulsePost(newContent.trim(), newCategory, isAnonymous);
    setNewContent('');
    setShowPostModal(false);
  };

  const handleSendComment = (postId: string) => {
    if (!commentInput.trim()) return;
    addComment(postId, commentInput.trim());
    setCommentInput('');
  };

  return (
    <div className="space-y-6">
      {/* Hero Banner: BUNK Pulse Universe */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-violet-950/60 via-slate-900/80 to-indigo-950/60 border border-violet-500/20 p-6 md:p-8 backdrop-blur-xl">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/15 border border-violet-500/30 text-violet-300 text-xs font-bold tracking-wider uppercase">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Live Campus Intelligence
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight">
              BUNK <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 via-fuchsia-400 to-cyan-400">— Escape The Routine.</span>
            </h1>
            <p className="text-slate-300 text-sm md:text-base leading-relaxed">
              Your parallel campus world. Discover what&apos;s really being talked about behind block walls, crack daily campus mysteries, and connect without the awkward intro.
            </p>
          </div>

          {/* Quick Hub Links */}
          <div className="grid grid-cols-2 gap-3 shrink-0">
            <Link
              href="/mystery"
              className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 hover:border-violet-500/40 hover:bg-violet-950/30 transition-all group"
            >
              <div className="flex items-center gap-2 text-violet-400 mb-1">
                <Search size={16} />
                <span className="text-xs font-bold uppercase tracking-wider">Mystery EP 01</span>
              </div>
              <p className="text-xs text-slate-300 font-semibold group-hover:text-white transition-colors">
                Solve Midnight Cipher
              </p>
              <span className="text-[10px] text-amber-400 font-mono mt-1 block">{mystery.expiresIn}</span>
            </Link>

            <Link
              href="/connect"
              className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 hover:border-emerald-500/40 hover:bg-emerald-950/30 transition-all group"
            >
              <div className="flex items-center gap-2 text-emerald-400 mb-1">
                <Users size={16} />
                <span className="text-xs font-bold uppercase tracking-wider">Blind Connect</span>
              </div>
              <p className="text-xs text-slate-300 font-semibold group-hover:text-white transition-colors">
                Meet Verified Student
              </p>
              <span className="text-[10px] text-emerald-400 font-mono mt-1 block">Instant match vibe</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Main Grid: Pulse Experiment & Campus Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Campus Feed (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Feed Header & Action */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Radio size={20} className="text-rose-500 animate-pulse" />
              <h2 className="text-lg font-black text-white tracking-wide">Campus Pulse Feed</h2>
              <span className="text-xs px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-slate-400 font-mono">
                {user.collegeShort} Verified
              </span>
            </div>

            <button
              onClick={() => setShowPostModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-violet-600/25 transition-all active:scale-95"
            >
              <PlusCircle size={15} />
              <span>Post Confession / Take</span>
            </button>
          </div>

          {/* Filter Chips */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  selectedCategory === cat
                    ? 'bg-violet-600 text-white shadow-md shadow-violet-600/20'
                    : 'bg-white/[0.03] text-slate-400 border border-white/5 hover:text-white hover:bg-white/[0.07]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Post Items */}
          <div className="space-y-3.5">
            {filteredPosts.map((post) => {
              const isCommentsOpen = activeCommentPostId === post.id;

              return (
                <div
                  key={post.id}
                  className="rounded-2xl bg-[#11131C] border border-white/5 p-4 sm:p-5 hover:border-white/10 transition-all shadow-sm"
                >
                  {/* Post Top Metadata */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-300">{post.authorTag}</span>
                      <span className="text-[10px] text-slate-500">•</span>
                      <span className="text-[11px] text-slate-500">{post.timeAgo}</span>
                    </div>

                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-300 border border-violet-500/20">
                      {post.category}
                    </span>
                  </div>

                  {/* Post Body */}
                  <p className="text-slate-100 text-sm md:text-base leading-relaxed mb-4">
                    {post.content}
                  </p>

                  {/* Reaction Buttons */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-white/5 text-xs">
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      {/* Fire */}
                      <button
                        onClick={() => reactToPost(post.id, 'fire')}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg transition-all ${
                          post.userReaction === 'fire'
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold'
                            : 'bg-white/[0.03] text-slate-400 hover:text-white hover:bg-white/[0.08]'
                        }`}
                      >
                        <Flame size={14} className={post.userReaction === 'fire' ? 'text-rose-400 fill-rose-400' : ''} />
                        <span>{post.reactions.fire}</span>
                      </button>

                      {/* Skull */}
                      <button
                        onClick={() => reactToPost(post.id, 'skull')}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg transition-all ${
                          post.userReaction === 'skull'
                            ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
                            : 'bg-white/[0.03] text-slate-400 hover:text-white hover:bg-white/[0.08]'
                        }`}
                      >
                        <Skull size={14} className={post.userReaction === 'skull' ? 'text-cyan-400' : ''} />
                        <span>{post.reactions.skull}</span>
                      </button>

                      {/* Tea (Spill the tea) */}
                      <button
                        onClick={() => reactToPost(post.id, 'tea')}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg transition-all ${
                          post.userReaction === 'tea'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold'
                            : 'bg-white/[0.03] text-slate-400 hover:text-white hover:bg-white/[0.08]'
                        }`}
                      >
                        <Coffee size={14} className={post.userReaction === 'tea' ? 'text-amber-400' : ''} />
                        <span>{post.reactions.tea}</span>
                      </button>
                    </div>

                    {/* Comments Toggle */}
                    <button
                      onClick={() => setActiveCommentPostId(isCommentsOpen ? null : post.id)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.04] transition-all"
                    >
                      <MessageSquare size={14} />
                      <span>{post.commentsCount} replies</span>
                    </button>
                  </div>

                  {/* Comment Thread Expansion */}
                  <AnimatePresence>
                    {isCommentsOpen && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-3 pt-3 border-t border-white/5 space-y-3"
                      >
                        {/* Comments list */}
                        <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                          {post.comments && post.comments.length > 0 ? (
                            post.comments.map((comm) => (
                              <div key={comm.id} className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 text-xs">
                                <div className="flex items-center justify-between text-slate-400 mb-1">
                                  <span className="font-semibold text-violet-300">{comm.author}</span>
                                  <span className="text-[10px] text-slate-500">{comm.timeAgo}</span>
                                </div>
                                <p className="text-slate-200">{comm.text}</p>
                              </div>
                            ))
                          ) : (
                            <p className="text-xs text-slate-500 italic">No replies yet. Be the first to drop your take.</p>
                          )}
                        </div>

                        {/* Comment input */}
                        <div className="flex items-center gap-2 pt-1">
                          <input
                            type="text"
                            placeholder="Add your anonymous take..."
                            value={commentInput}
                            onChange={(e) => setCommentInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSendComment(post.id);
                            }}
                            className="flex-1 bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-500"
                          />
                          <button
                            onClick={() => handleSendComment(post.id)}
                            className="p-2 rounded-xl bg-violet-600 text-white hover:bg-violet-500 transition-colors"
                          >
                            <Send size={14} />
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: The Pulse (Social Experiment) & Campus Hub (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* THE PULSE: Daily Social Experiment */}
          <div className="rounded-3xl bg-[#11131C] border border-violet-500/25 p-5 md:p-6 shadow-xl relative overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <BarChart2 size={18} className="text-violet-400" />
                <span className="text-xs font-black uppercase tracking-wider text-violet-400">
                  The Daily Pulse • Social Experiment
                </span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold">
                {currentPoll.totalVotes.toLocaleString()} VOTES
              </span>
            </div>

            <h3 className="text-base sm:text-lg font-bold text-white mb-1.5 leading-snug">
              {currentPoll.question}
            </h3>
            <p className="text-xs text-slate-400 mb-4">{currentPoll.context}</p>

            {/* Poll Options */}
            <div className="space-y-2.5">
              {currentPoll.options.map((option) => {
                const isSelected = currentPoll.userVotedOptionId === option.id;
                const percentage = Math.round((option.votes / Math.max(1, currentPoll.totalVotes)) * 100);

                return (
                  <button
                    key={option.id}
                    onClick={() => votePoll(option.id)}
                    className={`w-full text-left p-3.5 rounded-2xl border transition-all relative overflow-hidden group ${
                      isSelected
                        ? 'border-violet-500 bg-violet-950/40 text-white shadow-md shadow-violet-500/20'
                        : 'border-white/5 bg-white/[0.02] text-slate-300 hover:border-white/15 hover:bg-white/[0.04]'
                    }`}
                  >
                    {/* Fill percentage bar */}
                    {currentPoll.userVotedOptionId && (
                      <div
                        className="absolute inset-y-0 left-0 bg-violet-600/15 border-r border-violet-500/30 transition-all duration-700 pointer-events-none"
                        style={{ width: `${percentage}%` }}
                      />
                    )}

                    <div className="relative z-10 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <span
                          className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                            isSelected ? 'border-violet-400 bg-violet-500' : 'border-slate-500'
                          }`}
                        >
                          {isSelected && <CheckCircle2 size={12} className="text-white" />}
                        </span>
                        <span className="text-xs sm:text-sm font-semibold">{option.label}</span>
                      </div>

                      {currentPoll.userVotedOptionId && (
                        <span className="text-xs font-mono font-bold text-violet-300 shrink-0">
                          {percentage}%
                        </span>
                      )}
                    </div>

                    {/* Department breakdown if voted */}
                    {currentPoll.userVotedOptionId && (
                      <div className="relative z-10 mt-2.5 pt-2 border-t border-white/5 flex items-center gap-3 text-[10px] text-slate-400 font-mono">
                        <span>CSE: {option.breakdown.CSE}%</span>
                        <span>ECE: {option.breakdown.ECE}%</span>
                        <span>MECH: {option.breakdown.MECH}%</span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {!currentPoll.userVotedOptionId && (
              <p className="text-[11px] text-violet-400 mt-3 text-center font-medium">
                Tap an option to reveal live campus branch breakdown (+75 XP)
              </p>
            )}
          </div>

          {/* Cross-Campus Rivalry Widget */}
          <div className="rounded-3xl bg-[#11131C] border border-cyan-500/20 p-5 relative overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                <Shield size={14} />
                Campus Warfare
              </span>
              <span className="text-[10px] font-mono text-slate-400">Warangal Hub</span>
            </div>

            <div className="flex items-center justify-between gap-3 my-3">
              <div className="text-center flex-1">
                <p className="text-xs font-bold text-white">{campusBattle.homeCollege.split(' ')[0]}</p>
                <p className="text-lg font-black text-cyan-400 font-mono">
                  {campusBattle.homeScore.toLocaleString()}
                </p>
                <span className="text-[10px] text-slate-400 font-semibold">Your Campus (#1)</span>
              </div>

              <div className="px-2.5 py-1 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-400 text-xs font-black">
                VS
              </div>

              <div className="text-center flex-1">
                <p className="text-xs font-bold text-white">{campusBattle.rivalCollege.split(' ')[0]}</p>
                <p className="text-lg font-black text-slate-400 font-mono">
                  {campusBattle.rivalScore.toLocaleString()}
                </p>
                <span className="text-[10px] text-slate-400 font-semibold">Rival Campus (#2)</span>
              </div>
            </div>

            <p className="text-[11px] text-slate-300 bg-white/[0.02] border border-white/5 p-2 rounded-xl text-center">
              Active Battle: {campusBattle.activeEvent}
            </p>

            <Link
              href="/squads"
              className="mt-3 flex items-center justify-center gap-1.5 w-full py-2 rounded-xl bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-500/30 text-cyan-300 font-bold text-xs transition-colors"
            >
              <span>View Squad Leaderboards</span>
              <ArrowRight size={13} />
            </Link>
          </div>

          {/* Mystery Teaser Card */}
          <div className="rounded-3xl bg-gradient-to-br from-[#12101F] to-[#1A162B] border border-purple-500/30 p-5 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-mono text-purple-400 font-bold tracking-wider">{mystery.episodeNumber}</span>
              <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 text-[10px] font-bold">
                {mystery.theories.length} THEORIES
              </span>
            </div>

            <h4 className="font-bold text-white text-base">{mystery.title}</h4>
            <p className="text-xs text-slate-300 line-clamp-2">{mystery.subtitle}</p>

            <Link
              href="/mystery"
              className="inline-flex items-center gap-2 text-xs font-bold text-purple-400 hover:text-purple-300 pt-1 group"
            >
              <span>Enter Mystery Room</span>
              <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </div>

      {/* New Confession / Post Modal */}
      <AnimatePresence>
        {showPostModal && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-lg rounded-3xl bg-[#131620] border border-white/10 p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Flame size={18} className="text-rose-400" />
                  Post Campus Confession or Buzz
                </h3>
                <button
                  onClick={() => setShowPostModal(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleCreatePost} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1.5">
                    Category
                  </label>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {(['Campus Buzz', 'Confession', 'Unpopular Opinion', 'Hot Take'] as PulsePost['category'][]).map(
                      (cat) => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setNewCategory(cat)}
                          className={`p-2 rounded-xl text-[11px] font-bold border transition-all text-center ${
                            newCategory === cat
                              ? 'border-violet-500 bg-violet-600/20 text-violet-300'
                              : 'border-white/5 bg-white/[0.02] text-slate-400 hover:text-white'
                          }`}
                        >
                          {cat}
                        </button>
                      )
                    )}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1.5">
                    What&apos;s going on? (Keep it campus safe)
                  </label>
                  <textarea
                    rows={4}
                    placeholder="Drop your unfiltered opinion, canteen glitch, or campus story..."
                    value={newContent}
                    onChange={(e) => setNewContent(e.target.value)}
                    className="w-full rounded-2xl bg-white/[0.03] border border-white/10 p-3.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500"
                  />
                </div>

                <div className="flex items-center justify-between pt-2">
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                    <input
                      type="checkbox"
                      checked={isAnonymous}
                      onChange={(e) => setIsAnonymous(e.target.checked)}
                      className="rounded accent-violet-600"
                    />
                    <span>Post as Anonymous ({user.branch} verified)</span>
                  </label>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowPostModal(false)}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs shadow-lg shadow-violet-600/30 transition-all"
                    >
                      Post Take (+50 XP)
                    </button>
                  </div>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
