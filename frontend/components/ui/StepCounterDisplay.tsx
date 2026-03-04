// components/ui/StepCounterDisplay.tsx
// Real-time step counter display with cadence and accuracy metrics

import React from 'react';
import { motion } from 'framer-motion';
import { Activity, Zap } from 'lucide-react';

interface StepCounterDisplayProps {
  steps: number;
  stepRate: number;
  cadence: number;
  isDetecting: boolean;
  accuracy?: string;
}

export default function StepCounterDisplay({
  steps,
  stepRate,
  cadence,
  isDetecting,
  accuracy = 'High',
}: StepCounterDisplayProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-[24px] p-6 border-2 border-emerald-200/50 shadow-sm overflow-hidden relative"
    >
      {/* Background pulse */}
      {isDetecting && (
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-1/2 -right-1/2 w-full h-full bg-gradient-to-br from-emerald-400/10 to-transparent rounded-full blur-3xl animate-pulse" />
        </div>
      )}

      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Activity size={20} className="text-emerald-600" />
              {isDetecting && (
                <motion.div
                  className="absolute inset-0 bg-emerald-400 rounded-full"
                  animate={{ scale: [1, 1.5, 1], opacity: [1, 0.3, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
              )}
            </div>
            <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
              {isDetecting ? 'Step Tracking Active' : 'Step Counter'}
            </span>
          </div>
          <div className="text-xs font-bold text-emerald-600 bg-white/50 px-2 py-1 rounded">
            {accuracy}
          </div>
        </div>

        {/* Main Step Count */}
        <div className="text-center mb-4">
          <motion.div
            key={steps}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="text-4xl sm:text-5xl font-black text-emerald-700 font-mono tabular-nums"
          >
            {steps.toLocaleString()}
          </motion.div>
          <div className="text-xs font-semibold text-emerald-600 uppercase tracking-[0.15em] mt-1">
            Steps Detected
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 gap-3">
          {/* Cadence */}
          <div className="bg-white/60 backdrop-blur rounded-lg p-3 border border-emerald-100">
            <div className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">
              Cadence
            </div>
            <motion.div
              key={cadence}
              initial={{ y: 4, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.2 }}
              className="text-xl font-black text-emerald-700 font-mono"
            >
              {cadence}
            </motion.div>
            <div className="text-xs text-gray-500">steps/min</div>
          </div>

          {/* Step Rate */}
          <div className="bg-white/60 backdrop-blur rounded-lg p-3 border border-emerald-100">
            <div className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">
              Rate (60s)
            </div>
            <motion.div
              key={stepRate}
              initial={{ y: 4, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.2 }}
              className="text-xl font-black text-emerald-700 font-mono"
            >
              {stepRate}
            </motion.div>
            <div className="text-xs text-gray-500">steps/min</div>
          </div>
        </div>

        {/* Status Indicator */}
        <div className="mt-4 pt-3 border-t border-emerald-200/50">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-600">Accelerometer Status</span>
            <motion.div
              animate={{ opacity: isDetecting ? 1 : 0.5 }}
              transition={{ duration: 0.6, repeat: Infinity, repeatType: 'reverse' }}
              className={`w-2 h-2 rounded-full ${isDetecting ? 'bg-emerald-500' : 'bg-gray-400'}`}
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
