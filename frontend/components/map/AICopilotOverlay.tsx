'use client';

import React, { useState } from 'react';
import { X, Bot, Send, Loader2, Sparkles, Shield, Swords, Compass, Clock, Zap, Sun, Package, Trophy, Gift } from 'lucide-react';
import { useLocalAI } from '../../hooks/useLocalAI';
import { motion } from 'framer-motion';

interface AICopilotOverlayProps {
  currentHex: string | undefined;
  faction: string | undefined;
  activeRunners: Record<string, any>;
  userPosition: { lat: number | null; lng: number | null } | null;
  onClose: () => void;
}

function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// 10 Tactical Copilot Core Features
const TACTICAL_FEATURES = [
  { id: 'rivals', icon: '⚔️', title: 'Rival Intercept Alerts', query: 'Are there any rival runners closing in on my hexes?' },
  { id: 'optimal_route', icon: '🗺️', title: 'Optimal Credit Routes', query: 'Suggest a 5km route nearby for maximum hex credit gains.' },
  { id: 'peak_hours', icon: '⏰', title: 'Peak-Hour Tactical Timers', query: 'When is the next 1.5x credit multiplier window?' },
  { id: 'boss_raid', icon: '👾', title: 'Boss Raid Intel', query: 'What is the current status of nearby Boss Raid guard hexes?' },
  { id: 'decay_defense', icon: '🛡️', title: 'Decay Defense Warnings', query: 'Which of my owned hexes are at high decay risk today?' },
  { id: 'stealth_route', icon: '👤', title: 'Stealth Blind-Spot Routes', query: 'Plan a stealth route avoiding heavy enemy territory.' },
  { id: 'weather', icon: '🌦️', title: 'Weather Reward Boosts', query: 'What weather multiplier boosts are active right now?' },
  { id: 'prestige', icon: '🧬', title: 'Prestige Rebirth Tips', query: 'How can I optimize my stats for the next Prestige Rebirth?' },
  { id: 'airdrop', icon: '📦', title: 'Loot Air-Drop Radars', query: 'Are there any supply crates or air-drops near my coordinates?' },
  { id: 'wagers', icon: '🤝', title: 'Wager Duel Scouting', query: 'Evaluate nearby runners for a competitive credit wager duel.' },
];

export default function AICopilotOverlay({ currentHex, faction, activeRunners, userPosition, onClose }: AICopilotOverlayProps) {
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; text: string }>>([]);
  const [input, setInput] = useState('');
  const { generate, isReady, isLoading, error } = useLocalAI({
    onComplete: (text) => {
      setMessages(prev => [...prev, { role: 'assistant', text }]);
    },
    onError: (err) => {
      setMessages(prev => [...prev, { role: 'assistant', text: `Error: ${err}` }]);
    }
  });

  const systemPrompt = `You are TerritoryBot, official Tactical Running Copilot for TerritoryRun.
Current H3 Hex: ${currentHex || 'Unknown'}. Faction: ${faction || 'None'}.
Location: Lat ${userPosition?.lat?.toFixed(5) || 'N/A'}, Lng ${userPosition?.lng?.toFixed(5) || 'N/A'}.
Answer with concise, strategic running advice focusing on the 10 tactical copilot features.`;

  const getMapContext = () => {
    const runners = Object.values(activeRunners).map((runner: any) => {
      let distanceMeters = 9999;
      if (userPosition?.lat && userPosition?.lng && runner.lat && runner.lng) {
        distanceMeters = Math.round(haversineMeters(userPosition.lat, userPosition.lng, runner.lat, runner.lng));
      }
      return {
        username: runner.username,
        faction: runner.faction,
        distanceMeters,
      };
    });

    return {
      currentHex,
      faction,
      userPosition: userPosition ? { lat: userPosition.lat, lng: userPosition.lng } : null,
      activeRunners: runners,
    };
  };

  const handleFeatureClick = (queryText: string) => {
    setMessages(prev => [...prev, { role: 'user', text: queryText }]);
    generate(queryText, systemPrompt, getMapContext());
  };

  const handleSend = () => {
    if (!input.trim()) return;
    const userMsg = input.trim();
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setInput('');
    generate(userMsg, systemPrompt, getMapContext());
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="absolute right-4 top-24 z-[1000] w-[min(400px,calc(100vw-6rem))] pointer-events-auto"
    >
      <div className="bg-white/95 backdrop-blur-xl border border-black/10 shadow-2xl rounded-3xl overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 border-b border-black/5 flex items-center justify-between bg-[#F8FAFB]">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-[#A594D3] to-[#2E7D52] flex items-center justify-center text-white">
              <Bot size={16} />
            </div>
            <div>
              <span className="text-[11px] font-black uppercase tracking-wider text-[#1a1a2e] block leading-none">Tactical Copilot</span>
              <span className="text-[9px] font-bold text-gray-400">10 Core Feature Suite</span>
            </div>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-xl bg-white border border-black/10 flex items-center justify-center text-gray-500 hover:text-[#1a1a2e] transition-colors">
            <X size={14} />
          </button>
        </div>

        {/* 10 Tactical Features Preset Bar */}
        <div className="p-2 border-b border-black/5 bg-gradient-to-r from-[#F0F7F4] to-white overflow-x-auto scrollbar-none flex items-center gap-1.5">
          {TACTICAL_FEATURES.map((feat) => (
            <button
              key={feat.id}
              onClick={() => handleFeatureClick(feat.query)}
              title={feat.title}
              className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white border border-black/10 text-[10px] font-extrabold text-[#1a1a2e] hover:border-[#2E7D52] hover:bg-[#F0F7F4] shrink-0 active:scale-95 transition-all shadow-sm"
            >
              <span>{feat.icon}</span>
              <span>{feat.title}</span>
            </button>
          ))}
        </div>

        <div className="p-4 space-y-3 max-h-[420px] overflow-y-auto custom-scrollbar">
          {messages.length === 0 && (
            <div className="text-center py-4 space-y-3">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-[#A594D3]/20 to-[#2E7D52]/20 flex items-center justify-center border border-[#2E7D52]/20 shadow-inner">
                <Sparkles size={26} className="text-[#2E7D52]" />
              </div>
              <div>
                <p className="text-xs font-black text-[#1a1a2e]">Tactical Copilot AI Online</p>
                <p className="text-[10px] font-semibold text-gray-400 leading-relaxed px-4">
                  Select a tactical command above or ask about routes, credits, boss raids & wagers.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-1.5 pt-2">
                {TACTICAL_FEATURES.slice(0, 6).map((f) => (
                  <button
                    key={f.id}
                    onClick={() => handleFeatureClick(f.query)}
                    className="flex items-center gap-2 p-2 rounded-xl bg-[#F8FAFB] border border-black/5 hover:bg-[#F0F7F4] hover:border-[#2E7D52]/30 text-left transition-all group"
                  >
                    <span className="text-sm group-hover:scale-110 transition-transform">{f.icon}</span>
                    <span className="text-[10px] font-bold text-gray-700 truncate">{f.title}</span>
                  </button>
                ))}
              </div>

              {error && (
                <div className="mt-3 p-3 rounded-xl bg-red-50 border border-red-100 text-left">
                  <p className="text-[10px] font-bold text-red-500 leading-relaxed">
                    Service error: {error}
                  </p>
                </div>
              )}
            </div>
          )}

          {messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[88%] rounded-2xl px-3 py-2.5 text-[11px] font-semibold leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-[#1a1a2e] text-white rounded-br-md shadow-sm'
                  : 'bg-[#F0F7F4] text-[#1a1a2e] rounded-bl-md border border-black/5 shadow-sm'
              }`}>
                {msg.text}
              </div>
            </div>
          ))}

          {isLoading && messages[messages.length - 1]?.role === 'user' && (
            <div className="flex justify-start">
              <div className="bg-[#F0F7F4] rounded-2xl rounded-bl-md px-3 py-2 border border-black/5">
                <Loader2 size={14} className="animate-spin text-[#2E7D52]" />
              </div>
            </div>
          )}
        </div>

        {isReady && (
          <div className="p-3 border-t border-black/5 bg-white">
            <div className="flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Ask tactical copilot..."
                className="flex-1 rounded-2xl border border-black/10 bg-[#F8FAFB] px-3 py-2.5 text-[11px] font-bold focus:outline-none focus:border-[#2E7D52] focus:bg-white transition-all placeholder:text-gray-400"
              />
              <button 
                onClick={handleSend} 
                disabled={!input.trim() || isLoading} 
                className="w-10 h-10 rounded-2xl bg-[#2E7D52] text-white flex items-center justify-center disabled:opacity-30 hover:bg-[#1f5939] active:scale-95 transition-all shadow-md"
              >
                <Send size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
