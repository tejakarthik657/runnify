'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Moon,
  Radio,
  Users,
  Mic,
  MicOff,
  Volume2,
  Send,
  MessageSquare,
  Sparkles,
  Flame,
  Coffee,
  Briefcase,
  Plus
} from 'lucide-react';
import { useBunkStore, LoungeRoom } from '../../store/bunkStore';

export default function AfterHoursPage() {
  const { user, lounges, addLoungeMessage } = useBunkStore();
  const [activeRoomId, setActiveRoomId] = useState<string>(lounges[0]?.id || 'room-1');
  const [chatInput, setChatInput] = useState<string>('');
  const [isMicOn, setIsMicOn] = useState<boolean>(false);

  const activeRoom = lounges.find((r) => r.id === activeRoomId) || lounges[0];

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !activeRoom) return;
    addLoungeMessage(activeRoom.id, chatInput.trim());
    setChatInput('');
  };

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-amber-950/60 via-[#18141F] to-purple-950/70 border border-amber-500/25 p-6 md:p-8 backdrop-blur-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-amber-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-bold uppercase tracking-wider">
              <Moon size={14} className="text-amber-400" />
              After Hours Lounges • Late Night Unfiltered
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight">
              After Hours <span className="text-amber-400">— Where Conversations Happen.</span>
            </h1>
            <p className="text-slate-300 text-sm md:text-base leading-relaxed">
              No formal Zoom calls. No classroom pressure. Drop in on live student lounges discussing unhinged tech ideas, hostel survival, and honest career talk.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="p-3.5 rounded-2xl bg-black/40 border border-amber-500/20 text-center">
              <span className="text-xs text-slate-400 font-bold block">Live Lounges</span>
              <span className="text-xl font-black text-amber-400 font-mono">3 Active</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Lounges List (4 Cols) */}
        <div className="lg:col-span-4 space-y-3">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">
              Active Campus Rooms
            </h2>
            <span className="text-[10px] text-amber-400 font-mono flex items-center gap-1">
              <Radio size={12} className="animate-pulse" /> Live Now
            </span>
          </div>

          {lounges.map((room) => {
            const isSelected = room.id === activeRoomId;

            return (
              <button
                key={room.id}
                onClick={() => setActiveRoomId(room.id)}
                className={`w-full text-left p-4 rounded-2xl border transition-all space-y-2 ${
                  isSelected
                    ? 'border-amber-500/60 bg-amber-950/30 text-white shadow-lg shadow-amber-950/20'
                    : 'border-white/5 bg-[#11131C] text-slate-300 hover:border-white/10 hover:bg-white/[0.02]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-400 truncate max-w-[180px]">
                    Hosted by {room.host}
                  </span>
                  <div className="flex items-center gap-1.5 text-[10px] font-mono text-emerald-400">
                    <Users size={12} />
                    <span>{room.listenersCount}</span>
                  </div>
                </div>

                <h3 className="text-sm font-bold leading-snug">{room.title}</h3>
                <p className="text-xs text-slate-400 line-clamp-1">{room.topic}</p>

                <div className="flex items-center gap-1.5 pt-1">
                  {room.tags.map((t) => (
                    <span
                      key={t}
                      className="text-[9px] px-2 py-0.5 rounded-full bg-white/5 text-slate-300 font-semibold"
                    >
                      #{t}
                    </span>
                  ))}
                </div>
              </button>
            );
          })}
        </div>

        {/* Right Column: Live Room Interaction Stage (8 Cols) */}
        {activeRoom && (
          <div className="lg:col-span-8 rounded-3xl bg-[#11131C] border border-white/10 flex flex-col h-[560px] overflow-hidden shadow-2xl">
            {/* Room Header Stage */}
            <div className="p-4 sm:p-5 border-b border-white/5 bg-gradient-to-r from-white/[0.03] to-transparent flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                    <Radio size={11} className="animate-pulse" /> LIVE STAGE
                  </span>
                  <span className="text-xs text-slate-400">• Host: {activeRoom.host}</span>
                </div>
                <h3 className="text-base font-bold text-white">{activeRoom.title}</h3>
                <p className="text-xs text-slate-300 mt-0.5">{activeRoom.topic}</p>
              </div>

              {/* Mic Toggle Simulation */}
              <button
                onClick={() => setIsMicOn(!isMicOn)}
                className={`p-3 rounded-2xl border transition-all flex items-center gap-2 text-xs font-bold ${
                  isMicOn
                    ? 'bg-rose-600 border-rose-500 text-white shadow-lg shadow-rose-600/30'
                    : 'bg-white/[0.04] border-white/10 text-slate-300 hover:text-white'
                }`}
              >
                {isMicOn ? <Mic size={16} /> : <MicOff size={16} />}
                <span className="hidden sm:inline">{isMicOn ? 'Live on Stage' : 'Request Mic'}</span>
              </button>
            </div>

            {/* Room Live Messages */}
            <div className="flex-1 p-4 sm:p-5 overflow-y-auto space-y-3">
              {activeRoom.messages.map((msg) => (
                <div key={msg.id} className="flex items-start gap-3 p-2.5 rounded-2xl bg-white/[0.02] border border-white/5">
                  <div className="w-8 h-8 rounded-xl bg-violet-950/80 border border-violet-500/30 flex items-center justify-center text-sm shrink-0">
                    {msg.avatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between text-xs mb-0.5">
                      <span className="font-bold text-violet-300">{msg.user}</span>
                      <span className="text-[10px] text-slate-500">{msg.time}</span>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">{msg.text}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Chat Input Bar */}
            <form onSubmit={handleSendMessage} className="p-3 border-t border-white/5 bg-white/[0.01] flex items-center gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Share your thoughts with the room..."
                className="flex-1 bg-black/40 border border-white/10 rounded-2xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
              <button
                type="submit"
                className="p-2.5 rounded-2xl bg-amber-600 hover:bg-amber-500 text-white transition-colors"
              >
                <Send size={15} />
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

