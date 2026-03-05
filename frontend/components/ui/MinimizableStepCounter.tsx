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
      className={`fixed top-20 right-4 z-50 ${className}`}
    >
      <AnimatePresence mode="wait">
        {isMinimized ? (
          <motion.button
            key="minimized"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsMinimized(false)}
            className="group relative"
          >
            {/* Minimal button - integrates with app design */}
            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-white border-2 border-gray-200 rounded-2xl shadow-sm hover:shadow-md hover:border-emerald-200 transition-all flex items-center justify-center text-emerald-600">
              <div className="relative flex items-center justify-center">
                <Activity size={20} className="sm:w-6 sm:h-6" strokeWidth={2} />
                {isDetecting && (
                  <motion.div
                    className="absolute inset-0.5 border-2 border-emerald-400 rounded-lg"
                    animate={{ scale: [1, 1.2, 1], opacity: [0.6, 0.2, 0.6] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  />
                )}
              </div>
            </div>
            
            {/* Tooltip hint */}
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.3 }}
              className="absolute top-full mt-2 right-0 bg-gray-900 text-white px-2 py-1 rounded text-xs font-semibold whitespace-nowrap shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
            >
              Steps
            </motion.div>
          </motion.button>
        ) : (
          <motion.div
            key="expanded"
            initial={{ scale: 0.95, opacity: 0, y: -10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: -10 }}
            className="bg-white rounded-2xl p-4 sm:p-5 border border-gray-200 shadow-lg overflow-hidden relative w-72 sm:w-80"
          >
            <div className="relative z-10">
              {/* Header with minimize button */}
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Activity size={16} className="sm:w-5 sm:h-5 text-emerald-600" />
                    {isDetecting && (
                      <motion.div
                        className="absolute inset-0 border border-emerald-400 rounded-full"
                        animate={{ scale: [1, 1.3, 1], opacity: [0.8, 0.3, 0.8] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      />
                    )}
                  </div>
                  <span className="text-xs sm:text-sm font-bold text-gray-800">
                    Steps
                  </span>
                </div>
                <button
                  onClick={() => setIsMinimized(true)}
                  className="p-1 hover:bg-gray-100 rounded transition-all"
                >
                  <ChevronDown size={16} className="text-gray-400" />
                </button>
              </div>

              {/* Accuracy badge */}
              <div className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded mb-3 inline-block">
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
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mt-1">
                  Steps detected
                </div>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 gap-2">
                {/* Cadence */}
                <div className="bg-gray-50 rounded-lg p-2.5 border border-gray-100">
                  <div className="text-xs font-semibold text-gray-600 uppercase mb-1">
                    Cadence
                  </div>
                  <motion.div
                    key={cadence}
                    initial={{ y: 4, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.2 }}
                    className="text-lg font-black text-emerald-700 font-mono"
                  >
                    {cadence}
                  </motion.div>
                  <div className="text-xs text-gray-500">steps/min</div>
                </div>

                {/* Step Rate */}
                <div className="bg-gray-50 rounded-lg p-2.5 border border-gray-100">
                  <div className="text-xs font-semibold text-gray-600 uppercase mb-1">
                    Rate
                  </div>
                  <motion.div
                    key={stepRate}
                    initial={{ y: 4, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.2 }}
                    className="text-lg font-black text-emerald-700 font-mono"
                  >
                    {stepRate}
                  </motion.div>
                  <div className="text-xs text-gray-500">steps/min</div>
                </div>
              </div>

              {/* Status Indicator */}
              <div className="mt-3 pt-3 border-t border-gray-100">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">Status</span>
                  <motion.div
                    animate={{ opacity: isDetecting ? 1 : 0.5 }}
                    transition={{ duration: 0.6, repeat: Infinity, repeatType: 'reverse' }}
                    className={`w-2 h-2 rounded-full ${isDetecting ? 'bg-emerald-500' : 'bg-gray-300'}`}
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
