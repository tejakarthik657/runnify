'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, Bot, Send, Loader2 } from 'lucide-react';
import { useLocalAI } from '../../hooks/useLocalAI';
import { motion, AnimatePresence } from 'framer-motion';

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

  const systemPrompt = `You are a tactical running copilot for TerritoryRun. Current H3 hex: ${currentHex || 'unknown'}. Faction: ${faction || 'none'}. Provide brief, strategic running advice.`;

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

  const suggestions = [
    { icon: '🗺️', text: 'Suggest a 5km route nearby' },
    { icon: '⏰', text: 'Best time to run for max credits' },
    { icon: '⚔️', text: 'How do invasions work?' },
    { icon: '🛡️', text: 'Tips for defending my territory' },
  ];

  const handleSuggestion = (suggestion: string) => {
    setMessages(prev => [...prev, { role: 'user', text: suggestion }]);
    generate(suggestion, systemPrompt, getMapContext());
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
      className="absolute right-4 top-24 z-[1000] w-[min(380px,calc(100vw-6rem))] pointer-events-auto"
    >
      <div className="bg-white/95 backdrop-blur-xl border border-white/60 shadow-2xl rounded-3xl overflow-hidden">
        <div className="px-4 py-3 border-b border-black/5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot size={16} className="text-[#A594D3]" />
            <span className="text-[10px] font-black uppercase tracking-widest text-[#1a1a2e]">Tactical Copilot</span>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg bg-white border border-black/10 flex items-center justify-center text-gray-500 hover:text-[#1a1a2e] transition-colors">
            <X size={14} />
          </button>
        </div>

        <div className="p-4 space-y-3 max-h-[420px] overflow-y-auto">
          {messages.length === 0 && (
            <div className="text-center py-4">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-[#A594D3]/20 to-[#A594D3]/5 flex items-center justify-center mb-4 border border-[#A594D3]/20">
                <Bot size={28} className="text-[#A594D3]" />
              </div>
              <p className="text-xs font-bold text-gray-600 mb-1">Groq-Powered Copilot</p>
              <p className="text-[10px] font-semibold text-gray-400 mb-5 leading-relaxed">
                Ask about routes, credits, invasions, or strategy.
              </p>
              
              <div className="grid grid-cols-1 gap-2">
                {suggestions.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => handleSuggestion(s.text)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-[#F8FAFB] border border-black/5 text-left hover:bg-[#A8D5BA]/10 hover:border-[#A8D5BA]/20 active:scale-[0.98] transition-all group"
                  >
                    <span className="text-base group-hover:scale-110 transition-transform">{s.icon}</span>
                    <span className="text-[11px] font-bold text-gray-600 group-hover:text-[#1a1a2e] transition-colors">{s.text}</span>
                  </button>
                ))}
              </div>

              {error && (
                <div className="mt-4 p-3 rounded-xl bg-red-50 border border-red-100">
                  <p className="text-[10px] font-bold text-red-500 leading-relaxed">
                    Service error: {error}
                  </p>
                </div>
              )}
            </div>
          )}

          {messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded-2xl px-3 py-2.5 text-[11px] font-semibold leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-[#1a1a2e] text-white rounded-br-md'
                  : 'bg-[#F0F7F4] text-[#1a1a2e] rounded-bl-md border border-black/5'
              }`}>
                {msg.text}
              </div>
            </div>
          ))}

          {isLoading && messages[messages.length - 1]?.role === 'user' && (
            <div className="flex justify-start">
              <div className="bg-[#F0F7F4] rounded-2xl rounded-bl-md px-3 py-2 border border-black/5">
                <Loader2 size={14} className="animate-spin text-[#A594D3]" />
              </div>
            </div>
          )}
        </div>

        {isReady && (
          <div className="p-3 border-t border-black/5 bg-white/50">
            <div className="flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Ask copilot..."
                className="flex-1 rounded-xl border border-black/10 bg-white px-3 py-2.5 text-[11px] font-semibold focus:outline-none focus:border-[#A594D3] focus:ring-1 focus:ring-[#A594D3]/20 transition-all"
              />
              <button 
                onClick={handleSend} 
                disabled={!input.trim() || isLoading} 
                className="w-9 h-9 rounded-xl bg-[#1a1a2e] text-white flex items-center justify-center disabled:opacity-30 hover:bg-[#2E7D52] active:scale-95 transition-all"
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
