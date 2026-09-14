'use client';

import React, { useState } from 'react';
import { Sparkles, Send, X, Loader2, MapPin, Star, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AskMapResponse, executeAskMapQuery } from '../../services/askMap.service';
import { PlacePOI } from '../../services/places.service';

interface AskMapPanelProps {
  userLat?: number;
  userLng?: number;
  onClose: () => void;
  onSelectPOI: (poi: PlacePOI) => void;
  onPOIsFound: (pois: PlacePOI[]) => void;
}

const QUICK_SUGGESTIONS = [
  'Find good cafes near me',
  'Restaurants open now',
  'Parks within 3 km',
  'Top rated gyms nearby',
];

export default function AskMapPanel({
  userLat,
  userLng,
  onClose,
  onSelectPOI,
  onPOIsFound,
}: AskMapPanelProps) {
  const [prompt, setPrompt] = useState('');
  const [history, setHistory] = useState<AskMapResponse[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleAsk = async (queryText?: string) => {
    const q = queryText || prompt;
    if (!q || !q.trim() || userLat === undefined || userLng === undefined) return;

    setIsLoading(true);
    const lastResponse = history[history.length - 1];
    const prevIntent = lastResponse?.intent;

    const result = await executeAskMapQuery(q, userLat, userLng, prevIntent);
    setHistory((prev) => [...prev, result]);
    onPOIsFound(result.places);
    setPrompt('');
    setIsLoading(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="absolute top-4 left-4 z-[1001] w-[min(440px,calc(100vw-2rem))] pointer-events-auto"
    >
      <div className="bg-white/95 backdrop-blur-xl border border-black/10 shadow-2xl rounded-3xl overflow-hidden p-4 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-black/5 pb-2">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-[#A594D3] to-[#2E7D52] flex items-center justify-center text-white">
              <Sparkles size={16} />
            </div>
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-[#1a1a2e]">
                Ask Map AI Copilot
              </h3>
              <p className="text-[10px] text-gray-400 font-medium">Natural language geospatial search</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition-all"
          >
            <X size={14} />
          </button>
        </div>

        {/* Conversation History / Results */}
        <div className="max-h-72 overflow-y-auto space-y-3 pr-1 custom-scrollbar">
          {history.length === 0 && (
            <div className="py-4 text-center space-y-2">
              <p className="text-xs font-bold text-gray-500">
                Ask anything about places around you!
              </p>
              <div className="flex flex-wrap gap-1.5 justify-center">
                {QUICK_SUGGESTIONS.map((sug) => (
                  <button
                    key={sug}
                    onClick={() => handleAsk(sug)}
                    className="px-2.5 py-1 rounded-xl bg-[#F0F7F4] border border-black/5 text-[10px] font-bold text-[#2E7D52] hover:bg-[#A8D5BA]/30 active:scale-95 transition-all"
                  >
                    ✨ {sug}
                  </button>
                ))}
              </div>
            </div>
          )}

          {history.map((resp, idx) => (
            <div key={idx} className="space-y-2 border-b border-black/5 pb-3">
              {/* User Prompt Bubble */}
              <div className="flex justify-end">
                <div className="bg-[#1a1a2e] text-white px-3 py-1.5 rounded-2xl text-xs font-extrabold max-w-[85%] shadow-sm">
                  {resp.query}
                </div>
              </div>

              {/* AI Explanation Bubble */}
              <div className="bg-[#F0F7F4] border border-[#A8D5BA]/40 p-3 rounded-2xl text-xs font-medium text-gray-700 leading-relaxed space-y-2">
                <div>{resp.aiExplanation}</div>

                {/* Found Places List */}
                {resp.places.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    {resp.places.slice(0, 4).map((poi) => (
                      <div
                        key={poi.id}
                        onClick={() => onSelectPOI(poi)}
                        className="flex items-center justify-between p-2 bg-white rounded-xl border border-black/5 hover:border-[#2E7D52] cursor-pointer group transition-all"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span className="text-sm">{poi.icon}</span>
                          <div className="truncate">
                            <div className="text-xs font-black text-[#1a1a2e] truncate">{poi.name}</div>
                            <div className="text-[10px] text-gray-400 font-bold">
                              {(poi.distanceMeters / 1000).toFixed(1)} km • {poi.rating}★
                            </div>
                          </div>
                        </div>
                        <ArrowRight size={14} className="text-gray-300 group-hover:text-[#2E7D52] shrink-0" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Input Bar */}
        <div className="relative flex items-center pt-1 border-t border-black/5">
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAsk()}
            placeholder="Ask e.g. 'Cafes within 2 km open now'..."
            className="w-full pl-3 pr-10 py-2.5 bg-[#F8FAFB] border border-black/10 rounded-2xl text-xs font-bold text-[#1a1a2e] focus:outline-none focus:border-[#2E7D52] focus:bg-white transition-all placeholder:text-gray-400"
          />
          <button
            onClick={() => handleAsk()}
            disabled={isLoading || !prompt.trim()}
            className="absolute right-2 p-1.5 bg-[#2E7D52] text-white rounded-xl disabled:opacity-40 hover:bg-[#1f5939] active:scale-95 transition-all shadow-md"
          >
            {isLoading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
          </button>
        </div>
      </div>
    </motion.div>
  );
}
