'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Sparkles,
  Zap,
  Flame,
  Moon,
  ShieldCheck,
  EyeOff,
  Send,
  AlertCircle
} from 'lucide-react';
import { useBunkStore } from '../../store/bunkStore';
import { toast } from 'react-hot-toast';

export default function CreateModal() {
  const { isCreateModalOpen, closeCreateModal, user, addDiscoverPost } = useBunkStore();
  const [selectedMode, setSelectedMode] = useState<'pulse' | 'hottake' | 'room'>('hottake');
  const [isShadow, setIsShadow] = useState<boolean>(false);
  const [content, setContent] = useState('');
  const [topic, setTopic] = useState('#CampusMyths');

  const topics = ['#CampusMyths', '#ProfQuotes', '#MidnightCanteen', '#PlacementsReality', '#HostelHacks'];

  if (!isCreateModalOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) {
      toast.error('Please enter your thought first!');
      return;
    }

    addDiscoverPost(content.trim(), topic, isShadow);
    toast.success(
      isShadow
        ? '🎭 Posted anonymously under Shadow Avatar!'
        : `⚡ Posted verified as @${user.handle}!`
    );
    setContent('');
    closeCreateModal();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-[rgba(5,6,9,0.85)] backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 40 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-lg bg-[#161822] border border-[#2A2F42] rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 shadow-2xl relative overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-[#1F2330]">
            <div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#8B5CF6]">
                Frictionless Expression • &lt; 15s
              </span>
              <h2 className="text-base font-bold text-white mt-0.5">Spark The Campus Conversation</h2>
            </div>
            <button
              onClick={closeCreateModal}
              className="p-1.5 rounded-xl bg-white/[0.04] text-[#828B9E] hover:text-white hover:bg-white/[0.08] transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Mode Selector */}
          <div className="grid grid-cols-3 gap-2 my-4">
            <button
              type="button"
              onClick={() => setSelectedMode('hottake')}
              className={`p-2.5 rounded-xl border text-center transition-all ${
                selectedMode === 'hottake'
                  ? 'border-[#8B5CF6] bg-[#8B5CF6]/15 text-white shadow-sm'
                  : 'border-[#1F2330] bg-[#10121A] text-[#828B9E] hover:text-white'
              }`}
            >
              <Flame size={16} className={`mx-auto mb-1 ${selectedMode === 'hottake' ? 'text-[#FF4D6D]' : ''}`} />
              <span className="text-[11px] font-semibold block">Hot Take</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedMode('pulse')}
              className={`p-2.5 rounded-xl border text-center transition-all ${
                selectedMode === 'pulse'
                  ? 'border-[#CCFF00] bg-[#CCFF00]/10 text-white shadow-sm'
                  : 'border-[#1F2330] bg-[#10121A] text-[#828B9E] hover:text-white'
              }`}
            >
              <Zap size={16} className={`mx-auto mb-1 ${selectedMode === 'pulse' ? 'text-[#CCFF00]' : ''}`} />
              <span className="text-[11px] font-semibold block">Pulse Dilemma</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedMode('room')}
              className={`p-2.5 rounded-xl border text-center transition-all ${
                selectedMode === 'room'
                  ? 'border-[#00F0FF] bg-[#00F0FF]/10 text-white shadow-sm'
                  : 'border-[#1F2330] bg-[#10121A] text-[#828B9E] hover:text-white'
              }`}
            >
              <Moon size={16} className={`mx-auto mb-1 ${selectedMode === 'room' ? 'text-[#00F0FF]' : ''}`} />
              <span className="text-[11px] font-semibold block">Live Room</span>
            </button>
          </div>

          {/* Privacy Dual Switch */}
          <div className="p-3 rounded-2xl bg-[#10121A] border border-[#1F2330] flex items-center justify-between gap-2 mb-4">
            <div className="flex items-center gap-2">
              {isShadow ? (
                <div className="w-8 h-8 rounded-xl bg-[#64748B]/20 text-[#94A3B8] border border-[#64748B]/30 flex items-center justify-center text-sm">
                  🎭
                </div>
              ) : (
                <div className="w-8 h-8 rounded-xl bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/30 flex items-center justify-center text-sm">
                  ⚡
                </div>
              )}
              <div>
                <span className="text-xs font-bold text-white block">
                  {isShadow ? 'Shadow Avatar Mode' : `${user.name} (Verified)`}
                </span>
                <span className="text-[10px] text-[#828B9E]">
                  {isShadow ? 'Identity masked with campus ID shield' : `${user.collegeShort} • ${user.branch} '26`}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsShadow(!isShadow)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                isShadow
                  ? 'bg-[#64748B]/20 border-[#64748B]/40 text-[#CBD5E1]'
                  : 'bg-[#8B5CF6]/20 border-[#8B5CF6]/40 text-[#C4B5FD]'
              }`}
            >
              {isShadow ? 'Switch to Verified' : 'Switch to Shadow'}
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3.5">
            {/* Topic Chips */}
            <div>
              <span className="text-[11px] font-medium text-[#828B9E] block mb-1.5">Select Topic Tag</span>
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                {topics.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTopic(t)}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-all ${
                      topic === t
                        ? 'bg-[#8B5CF6] text-white'
                        : 'bg-[#1E212D] text-[#828B9E] hover:text-white border border-[#1F2330]'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <textarea
                rows={3}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={
                  selectedMode === 'pulse'
                    ? "Suggest tomorrow's campus poll dilemma..."
                    : selectedMode === 'room'
                    ? "What topic are you hosting in After Hours tonight?"
                    : "Drop your unfiltered campus observation or hot take..."
                }
                className="w-full bg-[#10121A] border border-[#2A2F42] rounded-2xl p-3 text-xs sm:text-sm text-white placeholder-[#525A6C] focus:outline-none focus:border-[#8B5CF6]"
              />
            </div>

            {/* Anti-Harassment Guardrail Notice */}
            <div className="flex items-center gap-1.5 text-[10px] text-[#828B9E]">
              <ShieldCheck size={13} className="text-[#10B981]" />
              <span>Real-time anti-harassment shield active. Campus safe conduct enforced.</span>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={closeCreateModal}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-[#828B9E] hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#8B5CF6] to-[#7C3AED] hover:from-[#9D74FF] hover:to-[#8B5CF6] text-white font-bold text-xs shadow-lg shadow-[#8B5CF6]/30 transition-all flex items-center gap-1.5"
              >
                <Send size={13} />
                <span>Post in &lt; 15s</span>
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
