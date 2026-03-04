import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, Zap, ChevronUp, ChevronDown } from 'lucide-react';

interface MinimizableStepCounterProps {
  steps: number;
  stepRate: number;
  cadence: number;
  isDetecting: boolean;
  accuracy?: string;
  className?: string;
}

/**
 * Minimizable step counter - can be toggled between expanded and minimized states
 * On mobile, minimized by default to prevent blocking the map
 */
export default function MinimizableStepCounter({
  steps,
  stepRate,
  cadence,
  isDetecting,
  accuracy = 'High',
  className = ''
}: MinimizableStepCounterProps) {
  const [isMinimized, setIsMinimized] = useState(() => {
    // Default to minimized on mobile (small screens)
    if (typeof window !== 'undefined') {
      return window.innerWidth < 768;
    }
    return true;
  });

  return (
    <motion.div
      layout
      className={`fixed bottom-4 right-4 z-40 ${className}`}
    >
      <AnimatePresence mode="wait">
        {isMinimized ? (
          <motion.button
            key="minimized"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            onClick={() => setIsMinimized(false)}
            className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full shadow-lg border-2 border-white flex items-center justify-center text-white hover:shadow-xl transition-all active:scale-95"
          >
            <div className="relative flex items-center justify-center">
              <Activity size={24} />
              {isDetecting && (
                <motion.div
                  className="absolute inset-1 border-2 border-white rounded-full"
                  animate={{ scale: [1, 1.3, 1], opacity: [1, 0.3, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
              )}
            </div>
          </motion.button>
        ) : (
          <motion.div
            key="expanded"
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-[24px] p-4 sm:p-6 border-2 border-emerald-200/50 shadow-xl overflow-hidden relative w-80 sm:w-96 max-w-[calc(100vw-2rem)]"
          >
            {/* Background pulse */}
            {isDetecting && (
              <div className="absolute inset-0 overflow-hidden">
                <div className="absolute -top-1/2 -right-1/2 w-full h-full bg-gradient-to-br from-emerald-400/10 to-transparent rounded-full blur-3xl animate-pulse" />
              </div>
            )}

            <div className="relative z-10">
              {/* Header with minimize button */}
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Activity size={18} className="sm:w-5 sm:h-5 text-emerald-600" />
                    {isDetecting && (
                      <motion.div
                        className="absolute inset-0 bg-emerald-400 rounded-full"
                        animate={{ scale: [1, 1.5, 1], opacity: [1, 0.3, 1] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      />
                    )}
                  </div>
                  <span className="text-xs sm:text-sm font-bold text-emerald-700 uppercase tracking-wider">
                    {isDetecting ? 'Step Tracking Active' : 'Step Counter'}
                  </span>
                </div>
                <button
                  onClick={() => setIsMinimized(true)}
                  className="p-1.5 sm:p-2 hover:bg-white/50 rounded-lg transition-all"
                >
                  <ChevronDown size={18} className="text-emerald-600" />
                </button>
              </div>

              {/* Accuracy badge */}
              <div className="text-xs font-bold text-emerald-600 bg-white/50 px-2 py-1 rounded mb-3 inline-block">
                {accuracy}
              </div>

              {/* Main Step Count */}
              <div className="text-center mb-4">
                <motion.div
                  key={steps}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.3 }}
                  className="text-3xl sm:text-4xl font-black text-emerald-700 font-mono tabular-nums"
                >
                  {steps.toLocaleString()}
                </motion.div>
                <div className="text-xs font-semibold text-emerald-600 uppercase tracking-[0.15em] mt-1">
                  Steps
                </div>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                {/* Cadence */}
                <div className="bg-white/60 backdrop-blur rounded-lg p-2 sm:p-3 border border-emerald-100">
                  <div className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">
                    Cadence
                  </div>
                  <motion.div
                    key={cadence}
                    initial={{ y: 4, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.2 }}
                    className="text-lg sm:text-xl font-black text-emerald-700 font-mono"
                  >
                    {cadence}
                  </motion.div>
                  <div className="text-xs text-gray-500">steps/min</div>
                </div>

                {/* Step Rate */}
                <div className="bg-white/60 backdrop-blur rounded-lg p-2 sm:p-3 border border-emerald-100">
                  <div className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">
                    Rate
                  </div>
                  <motion.div
                    key={stepRate}
                    initial={{ y: 4, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.2 }}
                    className="text-lg sm:text-xl font-black text-emerald-700 font-mono"
                  >
                    {stepRate}
                  </motion.div>
                  <div className="text-xs text-gray-500">steps/min</div>
                </div>
              </div>

              {/* Status Indicator */}
              <div className="mt-3 pt-3 border-t border-emerald-200/50">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-600">Status</span>
                  <motion.div
                    animate={{ opacity: isDetecting ? 1 : 0.5 }}
                    transition={{ duration: 0.6, repeat: Infinity, repeatType: 'reverse' }}
                    className={`w-2 h-2 rounded-full ${isDetecting ? 'bg-emerald-500' : 'bg-gray-400'}`}
                  />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
