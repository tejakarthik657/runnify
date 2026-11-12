'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageCircle,
  Users,
  Sparkles,
  ShieldCheck,
  Send,
  Eye,
  CheckCircle,
  Clock,
  RotateCcw,
  Zap,
  Lock,
  UserCheck,
  Flame
} from 'lucide-react';
import { useBunkStore } from '../../store/bunkStore';

interface ChatMessage {
  id: string;
  sender: 'me' | 'them' | 'system';
  text: string;
  time: string;
}

const VIBE_TOPICS = [
  { id: 'tech', label: 'Late Night Tech & Hacks', icon: '💻', prompt: 'What is the most ridiculous bug that kept you awake past 3 AM?' },
  { id: 'music', label: 'Indie Music & Jamming', icon: '🎸', prompt: 'Which track instantly cures the post-lecture headache?' },
  { id: 'food', label: 'Canteen & Hostel Lore', icon: '☕', prompt: 'Which canteen snack is secretly the best food item on campus?' },
  { id: 'startup', label: 'Dumb Startup Ideas', icon: '🚀', prompt: 'What app idea would solve our college daily struggle right now?' },
  { id: 'rant', label: 'Campus Rants', icon: '🔥', prompt: 'What is one rule on this campus that makes zero sense?' }
];

export default function ConnectPage() {
  const { user } = useBunkStore();
  const [selectedVibe, setSelectedVibe] = useState(VIBE_TOPICS[0]);
  const [sessionState, setSessionState] = useState<'idle' | 'matching' | 'connected' | 'revealed'>('idle');

  // Match info
  const [partner, setPartner] = useState({
    alias: 'Anonymous Student',
    branch: 'ECE',
    year: '3rd Year',
    college: 'KITSW',
    realName: 'Ananya Reddy',
    avatar: '🌸',
    bio: 'Synth-pop listener, circuit designer, tea enthusiast.',
    interests: ['Robotics', 'Indie Rock', 'Late-night tea']
  });

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [myRevealReq, setMyRevealReq] = useState(false);
  const [theyRevealed, setTheyRevealed] = useState(false);

  const startMatching = () => {
    setSessionState('matching');
    setMyRevealReq(false);
    setTheyRevealed(false);

    setTimeout(() => {
      setSessionState('connected');
      setMessages([
        {
          id: 'sys-1',
          sender: 'system',
          text: `⚡ Matched with a verified ${partner.branch} '${partner.year.slice(0, 2)} student. Identity is hidden until you both click reveal!`,
          time: 'Just now'
        },
        {
          id: 'sys-2',
          sender: 'system',
          text: `🎯 Prompt: "${selectedVibe.prompt}"`,
          time: 'Just now'
        },
        {
          id: 'msg-them-1',
          sender: 'them',
          text: `Hey! Honestly, for me it was debugging a missing semicolon in our embedded C lab that ended up taking 3 hours haha. What about you?`,
          time: 'Just now'
        }
      ]);
    }, 1800);
  };

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const userMsg: ChatMessage = {
      id: `me-${Date.now()}`,
      sender: 'me',
      text: inputText.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    const currentInput = inputText;
    setInputText('');

    // Simulate smart student response after 1.5s
    setTimeout(() => {
      const responses = [
        "Haha totally agree! Our professors pretend they understand it too but they don't.",
        "That's so relatable. Are you living in the campus hostels or day scholar?",
        "No way, I literally discussed the exact same thing in our canteen bench yesterday!",
        "Bro you have great taste. We should definitely grab tea sometime near Block 3."
      ];
      const randomResponse = responses[Math.floor(Math.random() * responses.length)];

      setMessages((prev) => [
        ...prev,
        {
          id: `them-${Date.now()}`,
          sender: 'them',
          text: randomResponse,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    }, 1400);
  };

  const requestReveal = () => {
    setMyRevealReq(true);

    // Simulate partner accepting after 1.2s
    setTimeout(() => {
      setTheyRevealed(true);
      setSessionState('revealed');
      setMessages((prev) => [
        ...prev,
        {
          id: `sys-reveal-${Date.now()}`,
          sender: 'system',
          text: `🎉 Both students agreed to reveal identities! Meet ${partner.realName} from ${partner.branch} Dept! (+120 XP)`,
          time: 'Just now'
        }
      ]);
    }, 1200);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-emerald-950/70 via-[#0F1E19] to-teal-950/70 border border-emerald-500/25 p-6 md:p-8 backdrop-blur-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-bold uppercase tracking-wider">
              <ShieldCheck size={14} />
              Zero Awkward Small Talk • Verified Students Only
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight">
              Blind Connect <span className="text-emerald-400">— Meet by Vibe.</span>
            </h1>
            <p className="text-slate-300 text-sm md:text-base leading-relaxed">
              Match with a student from your campus with similar interests without sharing phone numbers or Instagram handles upfront. Chat anonymously. Reveal identity only when both vibe.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-3.5 rounded-2xl bg-black/40 border border-emerald-500/20 text-center">
              <span className="text-xs text-slate-400 font-bold block">Students in Queue</span>
              <span className="text-xl font-black text-emerald-400 font-mono">34 active</span>
            </div>
          </div>
        </div>
      </div>

      {sessionState === 'idle' && (
        <div className="max-w-2xl mx-auto rounded-3xl bg-[#11131C] border border-white/10 p-6 md:p-8 space-y-6">
          <div>
            <h3 className="text-lg font-bold text-white mb-1">Pick Your Conversation Vibe</h3>
            <p className="text-xs text-slate-400">
              Select what you want to talk about right now. We will pair you with another verified student with matching frequency.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {VIBE_TOPICS.map((topic) => {
              const isSelected = topic.id === selectedVibe.id;

              return (
                <button
                  key={topic.id}
                  onClick={() => setSelectedVibe(topic)}
                  className={`p-4 rounded-2xl border text-left transition-all flex items-start gap-3 ${
                    isSelected
                      ? 'border-emerald-500 bg-emerald-950/30 text-white shadow-lg shadow-emerald-900/20'
                      : 'border-white/5 bg-white/[0.02] text-slate-300 hover:border-white/15'
                  }`}
                >
                  <span className="text-2xl">{topic.icon}</span>
                  <div>
                    <span className="text-xs font-bold block">{topic.label}</span>
                    <span className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">{topic.prompt}</span>
                  </div>
                </button>
              );
            })}
          </div>

          <button
            onClick={startMatching}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-sm shadow-xl shadow-emerald-600/30 transition-all flex items-center justify-center gap-2"
          >
            <Sparkles size={16} />
            <span>Launch Blind Connect Match</span>
          </button>
        </div>
      )}

      {sessionState === 'matching' && (
        <div className="max-w-md mx-auto rounded-3xl bg-[#11131C] border border-emerald-500/30 p-8 text-center space-y-5">
          <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
            <span className="absolute inset-0 rounded-full border-2 border-emerald-400 border-t-transparent animate-spin" />
            <span className="text-3xl">{selectedVibe.icon}</span>
          </div>

          <div>
            <h3 className="text-base font-bold text-white">Scanning Campus Node...</h3>
            <p className="text-xs text-slate-400 mt-1">
              Matching with verified students on &apos;{selectedVibe.label}&apos;
            </p>
          </div>

          <div className="text-[11px] font-mono text-emerald-400 bg-emerald-950/40 p-2.5 rounded-xl border border-emerald-500/20">
            Encrypted handshake in progress (KITSW Campus Node)
          </div>
        </div>
      )}

      {(sessionState === 'connected' || sessionState === 'revealed') && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-5xl mx-auto">
          {/* Main Chat Box (8 Cols) */}
          <div className="lg:col-span-8 rounded-3xl bg-[#11131C] border border-white/10 flex flex-col h-[560px] overflow-hidden shadow-2xl">
            {/* Chat Top Bar */}
            <div className="p-4 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-950/80 border border-emerald-500/30 flex items-center justify-center text-lg">
                  {sessionState === 'revealed' ? partner.avatar : '🕶️'}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white">
                      {sessionState === 'revealed' ? partner.realName : partner.alias}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold">
                      {partner.branch} &apos;{partner.year.slice(0, 2)}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400">
                    {sessionState === 'revealed' ? 'Verified Profile Revealed' : 'Anonymous Mode (Encrypted)'}
                  </span>
                </div>
              </div>

              {sessionState === 'connected' && (
                <button
                  onClick={requestReveal}
                  disabled={myRevealReq}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                    myRevealReq
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 cursor-wait'
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20'
                  }`}
                >
                  <Eye size={13} />
                  <span>{myRevealReq ? 'Waiting for their Reveal...' : 'Reveal Identity'}</span>
                </button>
              )}
            </div>

            {/* Messages Feed */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3">
              {messages.map((m) => {
                if (m.sender === 'system') {
                  return (
                    <div
                      key={m.id}
                      className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 text-center text-xs text-slate-300 max-w-lg mx-auto"
                    >
                      {m.text}
                    </div>
                  );
                }

                const isMe = m.sender === 'me';
                return (
                  <div
                    key={m.id}
                    className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`max-w-md p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                        isMe
                          ? 'bg-emerald-600 text-white rounded-br-none shadow-md shadow-emerald-600/20'
                          : 'bg-[#181C28] text-slate-200 border border-white/5 rounded-bl-none'
                      }`}
                    >
                      {m.text}
                    </div>
                    <span className="text-[10px] text-slate-500 mt-1 px-1">{m.time}</span>
                  </div>
                );
              })}
            </div>

            {/* Input Bar */}
            <form onSubmit={sendMessage} className="p-3 border-t border-white/5 bg-white/[0.01] flex items-center gap-2">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Type your reply without awkwardness..."
                className="flex-1 bg-black/40 border border-white/10 rounded-2xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
              <button
                type="submit"
                className="p-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
              >
                <Send size={15} />
              </button>
            </form>
          </div>

          {/* Right Partner / Identity Card (4 Cols) */}
          <div className="lg:col-span-4 space-y-4">
            {sessionState === 'revealed' ? (
              <div className="rounded-3xl bg-[#11131C] border border-emerald-500/30 p-5 space-y-4 shadow-xl">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
                  <UserCheck size={16} />
                  <span>Match Confirmed</span>
                </div>

                <div className="text-center space-y-2 pb-2 border-b border-white/5">
                  <div className="w-16 h-16 rounded-3xl bg-emerald-950/60 border-2 border-emerald-500/40 flex items-center justify-center text-3xl mx-auto shadow-inner">
                    {partner.avatar}
                  </div>
                  <h4 className="text-base font-bold text-white">{partner.realName}</h4>
                  <p className="text-xs text-emerald-400 font-semibold">{partner.college}</p>
                  <p className="text-[11px] text-slate-400">{partner.branch} Dept • {partner.year}</p>
                </div>

                <p className="text-xs text-slate-300 italic">{partner.bio}</p>

                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                    Shared Vibe Interests
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {partner.interests.map((it) => (
                      <span key={it} className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-semibold">
                        {it}
                      </span>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => setSessionState('idle')}
                  className="w-full py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-xs font-bold text-white transition-colors flex items-center justify-center gap-2"
                >
                  <RotateCcw size={14} />
                  <span>Start New Blind Match</span>
                </button>
              </div>
            ) : (
              <div className="rounded-3xl bg-[#11131C] border border-white/5 p-5 space-y-4 text-center">
                <div className="w-14 h-14 rounded-2xl bg-white/[0.02] border border-white/10 flex items-center justify-center text-2xl mx-auto text-slate-500">
                  <Lock size={22} className="text-slate-400" />
                </div>
                <h4 className="text-sm font-bold text-white">Identity Shielded</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Neither student can see the other&apos;s real name, photos, or socials until both participants tap &apos;Reveal Identity&apos;.
                </p>

                <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/5 text-[11px] text-slate-300 space-y-1 text-left font-mono">
                  <div>• Campus: {user.collegeShort}</div>
                  <div>• Branch: Matched with {partner.branch}</div>
                  <div>• Year: {partner.year}</div>
                </div>

                <button
                  onClick={() => setSessionState('idle')}
                  className="w-full py-2 rounded-xl text-xs text-slate-400 hover:text-white transition-colors"
                >
                  End Chat & Return
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

