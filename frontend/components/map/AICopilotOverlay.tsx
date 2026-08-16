'use client';

import React, { useState, useRef } from 'react';
import { X, Bot, Send, Loader2 } from 'lucide-react';
import { useLocalAI } from '../../hooks/useLocalAI';
import { motion, AnimatePresence } from 'framer-motion';

interface AICopilotOverlayProps {
  currentHex: string | undefined;
  faction: string | undefined;
  onClose: () => void;
}

export default function AICopilotOverlay({ currentHex, faction, onClose }: AICopilotOverlayProps) {
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; text: string }>>([]);
  const [input, setInput] = useState('');
  const { generate, isReady, isLoading, error } = useLocalAI({
    onComplete: (text) => {
      setMessages(prev => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last?.role === 'assistant') {
          last.text = text;
        }
        return updated;
      });
    },
    onError: (err) => {
        setMessages(prev => [...prev, { role: 'assistant', text: `Error: ${err}` }]);
    }
  });

  const systemPrompt = `You are a tactical running copilot for TerritoryRun. Current H3 hex: ${currentHex || 'unknown'}. Faction: ${faction || 'none'}. Provide brief, strategic running advice.`;

  const handleSend = () => {
    if (!input.trim()) return;
    const userMsg = input.trim();
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setInput('');
    generate(userMsg, systemPrompt);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="absolute right-4 top-24 z-[1000] w-[min(360px,calc(100vw-6rem))] pointer-events-auto"
    >
      <div className="bg-white/90 backdrop-blur-xl border border-white/60 shadow-2xl rounded-3xl overflow-hidden">
        <div className="px-4 py-3 border-b border-black/5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot size={14} className="text-[#A594D3]" />
            <span className="text-[10px] font-black uppercase tracking-widest text-[#1a1a2e]">Tactical Copilot</span>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg bg-white border border-black/10 flex items-center justify-center text-gray-500 hover:text-[#1a1a2e]">
            <X size={14} />
          </button>
        </div>

        <div className="p-3 space-y-3 max-h-[400px] overflow-y-auto">
          {messages.length === 0 && (
            <div className="text-center py-6">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-[#A594D3]/10 flex items-center justify-center mb-3">
                <Bot size={24} className="text-[#A594D3]" />
              </div>
              <p className="text-[11px] font-bold text-gray-500">
                Groq-powered copilot ready. Ask for route suggestions or tactical advice.
              </p>
              {error && (
                <p className="text-[10px] font-bold text-red-500 mt-2">API error: {error}</p>
              )}
            </div>
          )}

          {messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-[11px] font-semibold ${
                msg.role === 'user'
                  ? 'bg-[#1a1a2e] text-white rounded-br-md'
                  : 'bg-[#F0F7F4] text-[#1a1a2e] rounded-bl-md'
              }`}>
                {msg.text}
              </div>
            </div>
          ))}

          {isLoading && messages[messages.length - 1]?.role === 'user' && (
            <div className="flex justify-start">
              <div className="bg-[#F0F7F4] rounded-2xl rounded-bl-md px-3 py-2">
                <Loader2 size={14} className="animate-spin text-[#A594D3]" />
              </div>
            </div>
          )}
        </div>

        {isReady && (
          <div className="p-3 border-t border-black/5">
            <div className="flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Ask copilot..."
                className="flex-1 rounded-xl border border-black/10 bg-white px-3 py-2 text-[11px] font-semibold focus:outline-none focus:border-[#A594D3]"
              />
              <button onClick={handleSend} disabled={!input.trim() || isLoading} className="w-9 h-9 rounded-xl bg-[#1a1a2e] text-white flex items-center justify-center disabled:opacity-40">
                <Send size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
