'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Play,
    Square,
    Zap,
    Crosshair,
    ChevronLeft,
    Loader2,
    Activity,
    Navigation,
    Wind,
    Radio
} from 'lucide-react';
import Link from 'next/link';
import useSWR from 'swr';
import { useCallback } from 'react';
import { toast } from 'react-hot-toast';
import api from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import Badge from '../../components/ui/Badge';
import StepCounterDisplay from '../../components/ui/StepCounterDisplay';
import { useGps } from '../../hooks/useGps';
import { useStepCounter } from '../../hooks/useStepCounter';

const fetcher = (url: string) => api.get(url).then(res => res.data);

export default function RunPage() {
    const { user, accessToken, updateUser } = useAuthStore();
    const [isRunning, setIsRunning] = useState(false);
    const [runId, setRunId] = useState<string | null>(null);
    const [isStarting, setIsStarting] = useState(false);
    const [isEnding, setIsEnding] = useState(false);
    const [stats, setStats] = useState({ distance: 0, time: 0, hexCount: 0, credits: 0, speed: 0, steps: 0 });
    const statsInterval = useRef<any>(null);

    // Track state locally for the UI
    const [position, setPosition] = useState<any>(null);
    const [gpsError, setGpsError] = useState<string | null>(null);

    // Initialize step counter with accelerometer
    const { steps: accelSteps, stepRate, cadence, isDetecting, start: startStepCounter, stop: stopStepCounter, reset: resetStepCounter } = useStepCounter({
        enabled: true,
        useAccelerometer: true,
        onUpdate: (state) => {
            // Update stats with accelerometer-detected steps  
            setStats(prev => ({
                ...prev,
                steps: Math.max(prev.steps || 0, state.steps),
            }));
        }
    });

    // useGPS handles real-time GPS tracking with production-ready filtering
    const { start: startGps, stop: stopGps, active: gpsActive } = useGps({
        enabled: true,
        onUpdate: (state: any) => {
            if (state.error) {
                setGpsError(state.error);
                toast.error(state.error);
                return;
            }
            setGpsError(null);
            // GPS point received
            if (state.lat && state.lng) {
                const point = { lat: state.lat, lng: state.lng, accuracy: state.accuracy || 8 };
                setPosition(point);
                handleGpsPoint(point);
            }
        }
    });

    const handleGpsPoint = useCallback((point: { lat: number; lng: number; accuracy?: number; altitude?: number }) => {
        if (!isRunning || !runId) return;

        api.post(`/run/${runId}/gps`, {
            points: [
                {
                    lat: point.lat,
                    lng: point.lng,
                    accuracy: point.accuracy || 10,
                    timestamp: Date.now()
                }
            ]
        }).catch(err => {
            const errorMsg = err.response?.data?.error || err.message;
            console.error('[GPS Upload Failed]', { message: errorMsg, status: err.response?.status });
        });
    }, [isRunning, runId]);

    const startTimer = useCallback(() => {
        if (statsInterval.current) return;
        statsInterval.current = setInterval(() => {
            setStats(prev => ({ ...prev, time: prev.time + 1 }));
        }, 1000);
    }, []);

    const stopTimer = useCallback(() => {
        if (statsInterval.current) {
            clearInterval(statsInterval.current);
            statsInterval.current = null;
        }
    }, []);

    useEffect(() => {
        const checkActiveRun = async () => {
            try {
                const { data } = await api.get('/run/active');
                if (data.activeRun) {
                    const run = data.activeRun;
                    setRunId(run._id);
                    setIsRunning(true);
                    const startedAt = new Date(run.startedAt).getTime();
                    const elapsedSeconds = Math.floor((Date.now() - startedAt) / 1000);
                    setStats({
                        distance: run.distanceKm || 0,
                        time: elapsedSeconds,
                        hexCount: run.hexesTotal || 0,
                        credits: Math.floor((run.hexesTotal || 0) * 1.5),
                        speed: 0, // Placeholder
                        steps: Math.max(0, Math.round((run.distanceKm || 0) * 1312)),
                    });
                    startTimer();
                }
            } catch (error) { /* No active run */ }
        };
        checkActiveRun();
        return () => stopTimer();
    }, [startTimer, stopTimer]);

    const startRun = async () => {
        setIsStarting(true);
        try {
            if (!position || position.lat === null || position.lng === null) {
                toast.error('Waiting for GPS location...');
                setIsStarting(false);
                return;
            }

            const { data } = await api.post('/run/start', {
                startPos: {
                    lat: position.lat,
                    lng: position.lng
                }
            });
            setRunId(data.run._id);
            setIsRunning(true);
            setStats({ distance: 0, time: 0, hexCount: 0, credits: 0, speed: 0, steps: 0 });
            resetStepCounter();
            startGps();
            startStepCounter();
            startTimer();
            toast.success('Campaign Initiated');
        } catch (error: any) {
            const errorMsg = error.response?.data?.error || 'Initialization failed';
            toast.error(errorMsg);
        } finally {
            setIsStarting(false);
        }
    };

    const endRun = async () => {
        if (!runId) return;
        setIsEnding(true);
        try {
            const { data } = await api.post(`/run/${runId}/end`, {
                lat: position?.lat || 0,
                lng: position?.lng || 0
            });

            if (data?.user) {
                updateUser({
                    credits: data.user.credits,
                    hexesOwned: data.user.hexesOwned,
                });
            }

            setIsRunning(false);
            setRunId(null);
            stopGps(); // Stop GPS
            stopStepCounter();
            stopTimer();
            setStats({ distance: 0, time: 0, hexCount: 0, credits: 0, speed: 0, steps: 0 });
            toast.success(`Mission Accomplished • ${data?.summary?.hexesClaimed || 0} claims • ${data?.summary?.creditsEarned || 0} TRC`);
        } catch (error: any) {
            const errorMsg = error.response?.data?.error || 'Sync error. Retrying...';
            toast.error(errorMsg);
        } finally {
            setIsEnding(false);
        }
    };

    const formatTime = (seconds: number) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    return (
        <div className="min-h-[calc(100vh-70px)] bg-[#F4F7F4] px-4 sm:px-6 lg:px-12 py-6 lg:py-12 font-['Nunito'] pb-32">
            {/* Header */}
            <header className="flex items-center justify-between mb-8 sm:mb-12">
                <Link href="/dashboard" className="p-2 sm:p-4 bg-white rounded-2xl border border-black/5 shadow-sm hover:shadow-md transition-all active:scale-95">
                    <ChevronLeft size={20} className="sm:w-6 sm:h-6 text-[#1a1a2e]" />
                </Link>
                <div className="text-right">
                    <div className="text-[9px] sm:text-[10px] font-black text-gray-400 uppercase tracking-widest">Operation Sector</div>
                    <div className="text-sm sm:text-lg font-black text-[#1a1a2e]">Central_Sortie_Alpha</div>
                </div>
            </header>

            <div className="max-w-2xl mx-auto space-y-6 sm:space-y-8">
                {/* Dynamic Timer Display */}
                <motion.div
                    layout
                    className="bg-[#F0F7F4] rounded-[28px] sm:rounded-[48px] p-6 sm:p-10 md:p-12 text-center border-2 border-[#A8D5BA]/20 shadow-inner overflow-hidden relative"
                >
                    <div className="relative z-10">
                        <Badge variant="sage" pulse className="mb-3 sm:mb-4">
                            {isRunning ? 'Mission in Progress' : 'Standby for Launch'}
                        </Badge>
                        <h2 className="text-5xl sm:text-6xl md:text-7xl font-black tracking-tighter text-[#1a1a2e] mb-2 font-mono tabular-nums">
                            {formatTime(stats.time)}
                        </h2>
                        <div className="text-xs sm:text-sm font-bold text-[#2E7D52] uppercase tracking-[0.2em]">Elapsed Time</div>
                    </div>
                    {/* Background decoration */}
                    <div className="absolute top-[-20%] left-[-10%] w-64 h-64 bg-[#A8D5BA] opacity-10 rounded-full blur-3xl animate-pulse" />
                </motion.div>

                {/* Step Counter Display */}
                {isRunning && (
                    <StepCounterDisplay
                        steps={stats.steps}
                        stepRate={stepRate}
                        cadence={cadence}
                        isDetecting={isDetecting}
                        accuracy="High"
                    />
                )}

                {/* KPI Grid */}
                <div className="grid grid-cols-2 gap-4">
                    <KPICard
                        label="Distance"
                        value={stats.distance.toFixed(2)}
                        unit="KM"
                        icon={<Navigation size={20} />}
                        color="text-[#1a1a2e]"
                    />
                    <KPICard
                        label="Speed"
                        value={stats.speed.toFixed(1)}
                        unit="KPH"
                        icon={<Wind size={20} />}
                        color="text-[#1a1a2e]"
                    />
                    <KPICard
                        label="Captured"
                        value={stats.hexCount}
                        unit="HEX"
                        icon={<Crosshair size={20} />}
                        color="text-[#2E7D52]"
                    />
                    <KPICard
                        label="Yield"
                        value={stats.credits}
                        unit="TRC"
                        icon={<Zap size={20} />}
                        color="text-[#A594D3]"
                    />
                </div>

                {/* Action Controls */}
                <div className="pt-8">
                    {!isRunning ? (
                        <button
                            onClick={startRun}
                            disabled={isStarting || !!gpsError}
                            className="w-full bg-[#A8D5BA] hover:bg-[#6CC89A] text-white p-8 rounded-[32px] shadow-[0_12px_40px_rgba(168,213,186,0.4)] transition-all active:scale-95 flex items-center justify-center gap-4 group"
                        >
                            {isStarting ? (
                                <Loader2 className="animate-spin" size={32} />
                            ) : (
                                <>
                                    <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                                        <Play size={24} fill="currentColor" stroke="none" />
                                    </div>
                                    <div className="text-left">
                                        <div className="text-xl font-black uppercase tracking-tight">Deploy to Grid</div>
                                        <div className="text-xs font-bold text-white/70 uppercase tracking-widest">Initialize GPS Uplink</div>
                                    </div>
                                </>
                            )}
                        </button>
                    ) : (
                        <div className="flex flex-col gap-4">
                            <Link
                                href="/map"
                                className="w-full bg-[#B5D5F5] hover:bg-[#97c1eb] text-[#2980B9] p-6 rounded-[28px] shadow-[0_8px_24px_rgba(181,213,245,0.4)] transition-all active:scale-95 flex items-center justify-center gap-4 group"
                            >
                                <div className="w-10 h-10 rounded-xl bg-white/40 flex items-center justify-center">
                                    <Navigation size={20} />
                                </div>
                                <span className="text-lg font-black uppercase tracking-tight">View Tactical Map</span>
                            </Link>

                            <button
                                onClick={endRun}
                                disabled={isEnding}
                                className="w-full bg-[#F4B8C1] hover:bg-[#E89BA5] text-[#c0392b] p-8 rounded-[32px] shadow-[0_12px_40px_rgba(244,184,193,0.4)] transition-all active:scale-95 flex items-center justify-center gap-4 group"
                            >
                                {isEnding ? (
                                    <Loader2 className="animate-spin" size={32} />
                                ) : (
                                    <>
                                        <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                                            <Square size={24} fill="currentColor" stroke="none" />
                                        </div>
                                        <div className="text-left">
                                            <div className="text-xl font-black uppercase tracking-tight">Abort Mission</div>
                                            <div className="text-xs font-bold text-[#c0392b]/70 uppercase tracking-widest">Terminate Active Sortie</div>
                                        </div>
                                    </>
                                )}
                            </button>
                        </div>
                    )}
                </div>

                {/* GPS Status Footer */}
                <div className="flex items-center justify-center gap-3 py-4">
                    <div className={`w-2 h-2 rounded-full ${position && position.accuracy < 20 ? 'bg-green-500' : 'bg-orange-500 animate-pulse'}`} />
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                        {position ? `GPS Accuracy: ${Math.round(position.accuracy)}m` : 'Searching for Signal...'}
                    </span>
                </div>
            </div>

            {/* Error Overlay */}
            <AnimatePresence>
                {gpsError && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                        className="fixed top-8 left-1/2 -translate-x-1/2 z-[2000] bg-[#E89BA5] px-6 py-4 rounded-2xl flex items-center gap-4 text-white font-black uppercase text-xs tracking-widest shadow-2xl border-2 border-white/20"
                    >
                        <Radio size={20} className="animate-pulse" />
                        Signal Lost: {gpsError}
                    </motion.div>
                )}
            </AnimatePresence>


        </div>
    );
}

function KPICard({ label, value, unit, icon, color }: any) {
    return (
        <div className="bg-white rounded-[32px] p-6 border border-black/5 shadow-sm flex flex-col items-center justify-center text-center">
            <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 mb-3">
                {icon}
            </div>
            <div className={`text-2xl font-black tracking-tighter ${color} tabular-nums`}>
                {value}
                <span className="text-[10px] font-black text-gray-400 ml-1 uppercase">{unit}</span>
            </div>
            <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">{label}</div>
        </div>
    );
}
