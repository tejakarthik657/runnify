'use client';

import React, { useState, useEffect } from 'react';
import { Activity, TrendingUp, Zap, Eye, EyeOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface StepCounterDebugProps {
  steps: number;
  stepRate: number;
  cadence: number;
  isDetecting: boolean;
  accelData?: { x: number; y: number; z: number };
}

export default function StepCounterDebug({ 
  steps, 
  stepRate, 
  cadence, 
  isDetecting,
  accelData 
}: StepCounterDebugProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [magnitude, setMagnitude] = useState(0);

  useEffect(() => {
    if (accelData) {
      const mag = Math.sqrt(
        accelData.x * accelData.x + 
        accelData.y * accelData.y + 
        accelData.z * accelData.z
      );
      setMagnitude(mag);
    }
  }, [accelData]);

  return (
    <>
      {/* Floating Toggle Button */}
      <button
        onClick={() => setIsVisible(!isVisible)}
        className="fixed bottom-24 right-4 z-[1001] w-14 h-14 bg-gradient-to-br from-purple-600 to-indigo-600 text-white rounded-2xl shadow-2xl flex items-center justify-center active:scale-95 transition-transform"
      >
        {isVisible ? <EyeOff size={24} /> : <Eye size={24} />}
      </button>

      {/* Debug Panel */}
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ x: -300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -300, opacity: 0 }}
            transition={{ type: 'spring', damping: 25 }}
            className="fixed left-4 bottom-32 z-[1001] w-80 max-w-[calc(100vw-2rem)]"
          >
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-3xl border border-white/10 shadow-2xl overflow-hidden backdrop-blur-xl">
              {/* Header */}
              <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center">
                    <Activity size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-tight">Step Counter</h3>
                    <p className="text-xs text-gray-400 font-medium">Live Debug Panel</p>
                  </div>
                </div>
                <div className={`w-3 h-3 rounded-full ${isDetecting ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
              </div>

              {/* Main Step Count */}
              <div className="px-6 py-8 bg-gradient-to-br from-purple-600/20 to-indigo-600/20 border-b border-white/10">
                <div className="text-center">
                  <div className="text-6xl font-black tabular-nums text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-400">
                    {steps.toLocaleString()}
                  </div>
                  <div className="text-sm font-bold text-gray-300 uppercase tracking-widest mt-2">
                    Total Steps
                  </div>
                </div>
              </div>

              {/* Metrics Grid */}
              <div className="p-6 space-y-4">
                <MetricRow 
                  label="Step Rate" 
                  value={stepRate} 
                  unit="steps/min" 
                  icon={<TrendingUp size={16} />}
                  color="text-cyan-400"
                />
                <MetricRow 
                  label="Cadence" 
                  value={cadence} 
                  unit="bpm" 
                  icon={<Zap size={16} />}
                  color="text-yellow-400"
                />
                <MetricRow 
                  label="Status" 
                  value={isDetecting ? 'ACTIVE' : 'IDLE'} 
                  unit="" 
                  icon={<Activity size={16} />}
                  color={isDetecting ? 'text-green-400' : 'text-red-400'}
                />
              </div>

              {/* Accelerometer Data */}
              {accelData && (
                <div className="px-6 pb-6">
                  <div className="bg-black/30 rounded-2xl p-4 border border-white/5">
                    <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
                      Accelerometer
                    </div>
                    <div className="space-y-2">
                      <AccelBar label="X" value={accelData.x} max={20} color="bg-red-500" />
                      <AccelBar label="Y" value={accelData.y} max={20} color="bg-green-500" />
                      <AccelBar label="Z" value={accelData.z} max={20} color="bg-blue-500" />
                      <div className="pt-2 border-t border-white/10 mt-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-gray-400">Magnitude</span>
                          <span className="text-sm font-black text-purple-400 tabular-nums">
                            {magnitude.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Detection Indicator */}
              <div className="px-6 pb-6">
                <div className={`rounded-2xl p-4 text-center ${
                  isDetecting 
                    ? 'bg-green-500/20 border border-green-500/30' 
                    : 'bg-red-500/20 border border-red-500/30'
                }`}>
                  <div className={`text-xs font-black uppercase tracking-widest ${
                    isDetecting ? 'text-green-300' : 'text-red-300'
                  }`}>
                    {isDetecting ? '✓ Sensor Active' : '✗ Sensor Inactive'}
                  </div>
                  {!isDetecting && (
                    <div className="text-xs text-gray-400 mt-2">
                      Start a run to enable step detection
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function MetricRow({ label, value, unit, icon, color }: any) {
  return (
    <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/10">
      <div className="flex items-center gap-2">
        <div className={color}>{icon}</div>
        <span className="text-sm font-medium text-gray-300">{label}</span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className={`text-lg font-black tabular-nums ${color}`}>
          {typeof value === 'number' ? value : value}
        </span>
        {unit && <span className="text-xs font-medium text-gray-400">{unit}</span>}
      </div>
    </div>
  );
}

function AccelBar({ label, value, max, color }: any) {
  const percentage = Math.min(Math.abs(value) / max * 100, 100);
  const isNegative = value < 0;
  
  return (
    <div className="flex items-center gap-3">
      <div className="w-4 text-xs font-bold text-gray-400">{label}</div>
      <div className="flex-1 relative h-6 bg-white/10 rounded-lg overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs font-bold text-white/50 tabular-nums">
            {value.toFixed(1)}
          </span>
        </div>
        <motion.div
          className={`absolute top-0 h-full ${color} opacity-60`}
          initial={{ width: 0 }}
          animate={{ 
            width: `${percentage}%`,
            left: isNegative ? `${50 - percentage / 2}%` : '50%'
          }}
          transition={{ type: 'spring', damping: 15 }}
        />
      </div>
    </div>
  );
}
