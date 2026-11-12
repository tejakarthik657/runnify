'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  User,
  ShieldCheck,
  Award,
  Sparkles,
  Zap,
  Flame,
  Plus,
  X,
  Edit3,
  MapPin,
  CheckCircle,
  Share2
} from 'lucide-react';
import { useBunkStore } from '../../store/bunkStore';

export default function ProfilePage() {
  const { user, updateUser } = useBunkStore();
  const [isEditing, setIsEditing] = useState(false);
  const [nameInput, setNameInput] = useState(user.name);
  const [handleInput, setHandleInput] = useState(user.handle);
  const [newTagInput, setNewTagInput] = useState('');

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateUser({
      name: nameInput.trim() || user.name,
      handle: handleInput.trim() || user.handle
    });
    setIsEditing(false);
  };

  const handleAddTag = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTagInput.trim()) return;
    if (!user.personalityTags.includes(newTagInput.trim())) {
      updateUser({
        personalityTags: [...user.personalityTags, newTagInput.trim()]
      });
    }
    setNewTagInput('');
  };

  const handleRemoveTag = (tag: string) => {
    updateUser({
      personalityTags: user.personalityTags.filter((t) => t !== tag)
    });
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Student Passport Card */}
      <div className="rounded-3xl bg-[#11131C] border border-violet-500/30 p-6 md:p-8 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-white/5">
          <div className="flex items-center gap-5">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-gradient-to-tr from-violet-900 to-indigo-900 border-2 border-violet-500/40 flex items-center justify-center text-4xl sm:text-5xl shadow-inner">
              {user.avatar}
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-white">{user.name}</h1>
                <span className="p-1 rounded-full bg-emerald-500/20 text-emerald-400" title="Verified Campus Student">
                  <ShieldCheck size={16} />
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-400 font-mono">{user.handle}</p>
              <div className="flex items-center gap-2 pt-1 text-xs text-violet-300 font-medium">
                <MapPin size={13} className="text-violet-400" />
                <span>{user.college}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-row md:flex-col items-center md:items-end justify-between gap-2 shrink-0">
            <span className="text-[10px] font-mono px-3 py-1 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30 font-bold uppercase tracking-wider">
              {user.branch} • {user.year}
            </span>

            <button
              onClick={() => setIsEditing(!isEditing)}
              className="px-3.5 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-xs font-semibold text-slate-300 flex items-center gap-1.5 transition-colors border border-white/5"
            >
              <Edit3 size={13} />
              <span>{isEditing ? 'Cancel Edit' : 'Edit Passport'}</span>
            </button>
          </div>
        </div>

        {/* Edit Form */}
        {isEditing && (
          <form onSubmit={handleSaveProfile} className="mt-5 p-4 rounded-2xl bg-black/40 border border-white/10 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-400 block mb-1">Display Name</label>
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-violet-500"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-400 block mb-1">Handle</label>
                <input
                  type="text"
                  value={handleInput}
                  onChange={(e) => setHandleInput(e.target.value)}
                  className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-violet-500"
                />
              </div>
            </div>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs"
            >
              Save Changes
            </button>
          </form>
        )}

        {/* Level and XP Meter */}
        <div className="mt-6 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-white flex items-center gap-1.5">
              <Sparkles size={14} className="text-amber-400" />
              Level {user.level}: {user.levelTitle}
            </span>
            <span className="font-mono text-amber-300 font-bold">{user.xp} / 2,000 XP</span>
          </div>
          <div className="h-2.5 w-full bg-black/40 rounded-full overflow-hidden border border-white/5">
            <div
              className="h-full bg-gradient-to-r from-violet-500 to-amber-400 rounded-full transition-all duration-700"
              style={{ width: `${Math.min(100, (user.xp / 2000) * 100)}%` }}
            />
          </div>
        </div>

        {/* Personality Tags */}
        <div className="mt-6 space-y-2.5">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Campus Vibe Tags
          </span>
          <div className="flex flex-wrap items-center gap-2">
            {user.personalityTags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-slate-200 font-medium"
              >
                <span>{tag}</span>
                <button
                  onClick={() => handleRemoveTag(tag)}
                  className="text-slate-500 hover:text-rose-400 transition-colors"
                >
                  <X size={12} />
                </button>
              </span>
            ))}

            {/* Add tag inline form */}
            <form onSubmit={handleAddTag} className="inline-flex items-center gap-1.5">
              <input
                type="text"
                value={newTagInput}
                onChange={(e) => setNewTagInput(e.target.value)}
                placeholder="+ Add tag..."
                className="w-28 bg-white/[0.02] border border-white/10 rounded-xl px-2.5 py-1 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-500"
              />
            </form>
          </div>
        </div>
      </div>

      {/* Achievements & Squad Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Achievements */}
        <div className="rounded-3xl bg-[#11131C] border border-white/10 p-5 md:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Award size={18} className="text-amber-400" />
              Campus Achievements
            </h3>
            <span className="text-xs text-slate-400">{user.achievements.length} Unlocked</span>
          </div>

          <div className="space-y-3">
            {user.achievements.map((ach) => (
              <div
                key={ach.id}
                className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 flex items-start gap-3"
              >
                <span className="text-2xl p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 shrink-0">
                  {ach.icon}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-white">{ach.title}</h4>
                    <span className="text-[10px] text-slate-500">{ach.unlockedAt}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">{ach.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Squad Membership Card */}
        <div className="rounded-3xl bg-[#11131C] border border-white/10 p-5 md:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Zap size={18} className="text-cyan-400" />
              Squad Affiliation
            </h3>
            <span className="text-xs text-cyan-400 font-bold">Rank #2</span>
          </div>

          <div className="p-4 rounded-2xl bg-cyan-950/20 border border-cyan-500/20 space-y-2">
            <div className="flex items-center gap-3">
              <span className="text-3xl">👾</span>
              <div>
                <h4 className="text-sm font-bold text-white">{user.squad}</h4>
                <p className="text-xs text-slate-400 italic">&ldquo;Rebooting campus reality.&rdquo;</p>
              </div>
            </div>
            <div className="pt-2 flex items-center justify-between text-xs text-slate-300 font-mono border-t border-white/5">
              <span>Points: 1,890 PTS</span>
              <span>Members: 6 Students</span>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 text-xs text-slate-400 leading-relaxed">
            Squad members earn 1.5x bonus XP during daily cross-campus battles and collaborative ARG mysteries.
          </div>
        </div>
      </div>
    </div>
  );
}
