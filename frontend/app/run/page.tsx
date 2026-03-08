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
    Radio,
    ShieldAlert,
    Wrench
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { useCallback } from 'react';
import { toast } from 'react-hot-toast';
import api from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import Badge from '../../components/ui/Badge';
import { useGps } from '../../hooks/useGps';
import { useStepCounter } from '../../hooks/useStepCounter';

const fetcher = (url: string) => api.get(url).then(res => res.data);

export default function RunPage() {
    const { user, accessToken, updateUser } = useAuthStore();
    const router = useRouter();
    const [isRunning, setIsRunning] = useState(false);
    const [runId, setRunId] = useState<string | null>(null);
    const [isStarting, setIsStarting] = useState(false);
    const [isEnding, setIsEnding] = useState(false);
    const [stats, setStats] = useState({ distance: 0, time: 0, hexCount: 0, credits: 0, speed: 0, steps: 0 });
    const statsInterval = useRef<any>(null);

    // Track state locally for the UI
    const [position, setPosition] = useState<any>(null);
    const [gpsError, setGpsError] = useState<string | null>(null);
    const [isAcquiringGps, setIsAcquiringGps] = useState(false);
    const [gpsAcquisitionTip, setGpsAcquisitionTip] = useState(0);
    const [showPreflight, setShowPreflight] = useState(false);
    const [showGpsHelper, setShowGpsHelper] = useState(false);
    const [warmupCountdown, setWarmupCountdown] = useState(0);
    const [anomalyCount, setAnomalyCount] = useState(0);
    const [trackQuality, setTrackQuality] = useState<'high' | 'medium' | 'low'>('medium');
    const accelStepsRef = useRef(0);
    const gpsFallbackStepsRef = useRef(0);
    const lastGpsPointRef = useRef<{ lat: number; lng: number } | null>(null);
    const lastGpsTsRef = useRef<number | null>(null);

    // Initialize step counter with accelerometer
    const { steps: accelSteps, stepRate, cadence, isDetecting, start: startStepCounter, stop: stopStepCounter, reset: resetStepCounter } = useStepCounter({
        enabled: true,
        useAccelerometer: true,
        onUpdate: (state) => {
            accelStepsRef.current = state.steps;
            setStats(prev => ({
                ...prev,
                steps: Math.max(state.steps, gpsFallbackStepsRef.current),
            }));
        }
    });

    const getDistanceKm = useCallback((lat1: number, lon1: number, lat2: number, lon2: number) => {
        const R = 6371;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }, []);

    // useGPS handles real-time GPS tracking with production-ready filtering
    const { start: startGps, stop: stopGps, active: gpsActive } = useGps({
        enabled: true,
        onUpdate: (state: any) => {
            if (state.error) {
                setGpsError(state.error);
                setIsAcquiringGps(false);
                toast.error(state.error);
                return;
            }
            setGpsError(null);
            // GPS point received
            if (state.lat && state.lng) {
                const point = { lat: state.lat, lng: state.lng, accuracy: state.accuracy || 8 };
                setPosition(point);
                setIsAcquiringGps(false);
                handleGpsPoint(point);
            }
        }
    });

    const handleGpsPoint = useCallback((point: { lat: number; lng: number; accuracy?: number; altitude?: number }) => {
        if (!isRunning || !runId) return;

        const nowTs = Date.now();
        const accuracy = point.accuracy || 10;
        const quality: 'high' | 'medium' | 'low' = accuracy <= 15 ? 'high' : accuracy <= 35 ? 'medium' : 'low';
        setTrackQuality(quality);
        localStorage.setItem('tr_track_quality', quality);
        localStorage.setItem('tr_last_gps_ts', String(nowTs));
        if (lastGpsPointRef.current && lastGpsTsRef.current) {
            const addedKm = getDistanceKm(lastGpsPointRef.current.lat, lastGpsPointRef.current.lng, point.lat, point.lng);
            const addedMeters = addedKm * 1000;
            const dtSec = Math.max(1, Math.floor((nowTs - lastGpsTsRef.current) / 1000));
            const speedKph = (addedKm * 3600) / dtSec;

            // Reject obvious GPS jumps/noise to improve live-trace quality
            if (addedMeters >= 1 && addedMeters < 500 && speedKph <= 50) {
                setStats(prev => {
                    const distance = parseFloat((prev.distance + addedKm).toFixed(5));
                    let mergedSteps = Math.max(accelStepsRef.current, gpsFallbackStepsRef.current);
                    const shouldUseGpsFallback = !isDetecting || accelStepsRef.current < 5;
                    if (shouldUseGpsFallback && addedMeters > 6) {
                        gpsFallbackStepsRef.current += Math.floor(addedMeters / 0.7);
                        mergedSteps = Math.max(mergedSteps, gpsFallbackStepsRef.current);
                    }
                    return {
                        ...prev,
                        distance,
                        speed: speedKph,
                        steps: mergedSteps,
                    };
                });
            } else {
                setAnomalyCount(prev => prev + 1);
            }
        }

        lastGpsPointRef.current = { lat: point.lat, lng: point.lng };
        lastGpsTsRef.current = nowTs;

        api.post(`/run/${runId}/gps`, {
            points: [
                {
                    lat: point.lat,
                    lng: point.lng,
                    accuracy: point.accuracy || 10,
                    timestamp: Date.now()
                }
            ]
        }).then(() => {
            const pending = Number(localStorage.getItem('pendingGpsQueue') || '0');
            if (pending > 0) {
                localStorage.setItem('pendingGpsQueue', String(Math.max(0, pending - 1)));
            }
        }).catch(err => {
            const errorMsg = err.response?.data?.error || err.message;
            console.error('[GPS Upload Failed]', { message: errorMsg, status: err.response?.status });
            const pending = Number(localStorage.getItem('pendingGpsQueue') || '0') + 1;
            localStorage.setItem('pendingGpsQueue', String(pending));
        });
    }, [isRunning, runId, getDistanceKm, isDetecting]);

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
        if (!isRunning) return;
        localStorage.setItem('tr_run_session', JSON.stringify({
            active: true,
            startedAt: Date.now() - (stats.time * 1000),
            distance: stats.distance,
            steps: stats.steps,
        }));
    }, [isRunning, stats.time, stats.distance, stats.steps]);

    useEffect(() => {
        const checkPreflight = async () => {
            try {
                const geoUnsupported = !('geolocation' in navigator);
                const motionNeeded = typeof window !== 'undefined' && 'DeviceMotionEvent' in window;
                if (geoUnsupported) {
                    setShowPreflight(true);
                    return;
                }
                if ((navigator as any).permissions?.query) {
                    const geo = await (navigator as any).permissions.query({ name: 'geolocation' });
                    if (geo.state === 'denied') {
                        setShowPreflight(true);
                    }
                }
                if (motionNeeded && (DeviceMotionEvent as any)?.requestPermission) {
                    // iOS users usually need explicit prompt, show helper card before first run
                    setShowPreflight(true);
                }
            } catch {
                // non-blocking
            }
        };
        checkPreflight();

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
                    accelStepsRef.current = Math.max(0, Math.round((run.distanceKm || 0) * 1312));
                    gpsFallbackStepsRef.current = accelStepsRef.current;
                    startTimer();
                    startStepCounter();
                    localStorage.setItem('tr_run_session', JSON.stringify({
                        active: true,
                        startedAt,
                        distance: run.distanceKm || 0,
                        steps: Math.max(0, Math.round((run.distanceKm || 0) * 1312)),
                    }));
                }
            } catch (error) { /* No active run */ }
        };
        checkActiveRun();
        return () => stopTimer();
    }, [startTimer, stopTimer, startStepCounter]);

    const startRun = async () => {
        // Cycle through motivational tips while acquiring GPS
        const tips = [
            "📡 Scanning for satellites...",
            "🗺️ Mapping nearby territory...",
            "⚡ Calibrating sensors...",
            "🎯 Locking position..."
        ];
        setGpsAcquisitionTip(0);
        const tipInterval = setInterval(() => {
            setGpsAcquisitionTip(prev => (prev + 1) % tips.length);
        }, 1500);

        setIsStarting(true);
        setIsAcquiringGps(true);
        
        try {
            if (!position || position.lat === null || position.lng === null) {
                // Wait a bit for GPS to acquire
                await new Promise(resolve => setTimeout(resolve, 2000));
                if (!position || position.lat === null || position.lng === null) {
                    clearInterval(tipInterval);
                    toast.error('GPS signal weak. Move to an open area.');
                    setIsStarting(false);
                    setIsAcquiringGps(false);
                    return;
                }
            }

            clearInterval(tipInterval);

            // Warm-up phase for better first-point stability
            setWarmupCountdown(10);
            for (let i = 10; i > 0; i--) {
                setWarmupCountdown(i);
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
            setWarmupCountdown(0);

            const { data } = await api.post('/run/start', {
                startPos: {
                    lat: position.lat,
                    lng: position.lng
                }
            });
            setRunId(data.run._id);
            setIsRunning(true);
            setStats({ distance: 0, time: 0, hexCount: 0, credits: 0, speed: 0, steps: 0 });
            accelStepsRef.current = 0;
            gpsFallbackStepsRef.current = 0;
            lastGpsPointRef.current = null;
            lastGpsTsRef.current = null;
            resetStepCounter();
            startGps();
            startStepCounter();
            startTimer();
            setAnomalyCount(0);
            localStorage.setItem('tr_run_session', JSON.stringify({ active: true, startedAt: Date.now(), distance: 0, steps: 0 }));
            if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
                navigator.vibrate([60, 40, 60]);
            }
            toast.success('Campaign Initiated');
        } catch (error: any) {
            clearInterval(tipInterval);
            const errorMsg = error.response?.data?.error || 'Initialization failed';
            toast.error(errorMsg);
        } finally {
            setIsStarting(false);
            setIsAcquiringGps(false);
        }
    };

    const endRun = async (attemptNumber = 1) => {
        if (!runId) return;
        setIsEnding(true);
        const MAX_RETRIES = 3;
        
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout
            
            const { data } = await api.post(`/run/${runId}/end`, {
                lat: position?.lat || 0,
                lng: position?.lng || 0,
                accelSteps: Math.max(stats.steps || 0, accelStepsRef.current, gpsFallbackStepsRef.current)
            }, { 
                signal: controller.signal,
                timeout: 60000 
            });

            clearTimeout(timeoutId);

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
            accelStepsRef.current = 0;
            gpsFallbackStepsRef.current = 0;
            lastGpsPointRef.current = null;
            lastGpsTsRef.current = null;
            localStorage.setItem('tr_run_session', JSON.stringify({ active: false }));
            if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
                navigator.vibrate([90, 40, 120]);
            }
            const flagText = anomalyCount > 0 ? ` • ${anomalyCount} anomaly flag${anomalyCount > 1 ? 's' : ''}` : '';
            toast.success(`Mission Accomplished • ${data?.summary?.hexesClaimed || 0} claims • ${data?.summary?.creditsEarned || 0} TRC${flagText}`);
            
            // Navigate to map page after mission ends
            router.push('/map');
        } catch (error: any) {
            // Retry logic with exponential backoff
            if (attemptNumber < MAX_RETRIES && (error.code === 'ABORT_ERR' || error.response?.status >= 500)) {
                const delayMs = Math.min(1000 * Math.pow(2, attemptNumber - 1), 10000);
                // Retry silently without showing toast
                setTimeout(() => {
                    endRun(attemptNumber + 1);
                }, delayMs);
            } else {
                const errorMsg = error.response?.data?.error || 'Sync error. Mission may have saved. Check map.';
                toast.error(errorMsg);
                setIsEnding(false);
            }
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

            <div className="lg:hidden mb-4 flex gap-2 overflow-x-auto no-scrollbar">
                {[
                    { href: '/dashboard', label: 'Dashboard' },
                    { href: '/map', label: 'Map' },
                    { href: '/leaderboard', label: 'Leaderboard' },
                    { href: '/faction', label: 'Faction' },
                    { href: '/profile', label: 'Profile' },
                ].map((item) => (
                    <Link
                        key={item.href}
                        href={item.href}
                        className="shrink-0 rounded-xl bg-white px-3 py-2 text-[10px] font-black uppercase tracking-wider text-[#1a1a2e] border border-black/5"
                    >
                        {item.label}
                    </Link>
                ))}
            </div>

            <div className="max-w-2xl mx-auto space-y-6 sm:space-y-8">
                {showPreflight && (
                    <div className="bg-[#FFF8F1] border border-[#FFD8A8] rounded-2xl p-4 flex items-start gap-3">
                        <ShieldAlert size={18} className="text-[#B45309] mt-0.5" />
                        <div className="min-w-0">
                            <p className="text-xs font-black uppercase tracking-widest text-[#B45309]">Permissions Preflight</p>
                            <p className="text-sm font-semibold text-[#7C2D12]">Enable precise location and motion permissions for Uber-like live tracking accuracy.</p>
                            <button onClick={() => setShowPreflight(false)} className="mt-2 px-3 py-1.5 rounded-lg bg-white border border-[#F2C28E] text-[11px] font-black uppercase tracking-wider text-[#92400E]">I have enabled them</button>
                        </div>
                    </div>
                )}

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

                {/* Live Step Counter Chip */}
                {isRunning && (
                    <div className="flex items-center justify-center gap-2">
                        <div className="inline-flex items-center gap-2 rounded-full border border-[#A8D5BA]/50 bg-white/90 px-4 py-2 shadow-sm backdrop-blur">
                            <Activity size={14} className={`${isDetecting ? 'text-emerald-600' : 'text-gray-400'}`} />
                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Steps</span>
                            <span className="text-base font-black tabular-nums text-[#1a1a2e]">{stats.steps.toLocaleString()}</span>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">live</span>
                        </div>
                    </div>
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
                                className="w-full group relative bg-gradient-to-br from-[#2980B9] to-[#1F618D] hover:from-[#3498DB] hover:to-[#2980B9] text-white p-6 rounded-[28px] shadow-[0_12px_32px_rgba(41,128,185,0.3)] transition-all active:scale-95 overflow-hidden"
                            >
                                {/* Animated background gradient */}
                                <div className="absolute inset-0 bg-gradient-to-r from-cyan-400/0 via-cyan-400/10 to-cyan-400/0 group-hover:from-cyan-400/10 group-hover:via-cyan-400/20 group-hover:to-cyan-400/10 transition-all duration-500" />
                                
                                <div className="relative flex items-center justify-center gap-3 z-10">
                                    <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center group-hover:bg-white/30 transition-all">
                                        <div className="w-5 h-5 rounded-full border-2 border-white/60 border-r-white animate-spin group-hover:border-r-cyan-300" />
                                    </div>
                                    <span className="text-base font-black uppercase tracking-wider">Live Tracker</span>
                                    <div className="w-2 h-2 rounded-full bg-cyan-300 animate-pulse" />
                                </div>
                            </Link>

                            <button
                                onClick={() => endRun()}
                                disabled={isEnding}
                                className="w-full group relative bg-gradient-to-br from-[#E89BA5] to-[#E74C3C] hover:from-[#F4B8C1] hover:to-[#E89BA5] text-white p-8 rounded-[32px] shadow-[0_12px_40px_rgba(232,155,165,0.3)] transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden"
                            >
                                {/* Pulse effect on hover */}
                                <div className="absolute inset-0 bg-white/10 group-hover:animate-pulse opacity-0 group-hover:opacity-100 transition-opacity" />
                                
                                <div className="relative z-10 flex items-center justify-center gap-4">
                                    {isEnding ? (
                                        <>
                                            <Loader2 className="animate-spin" size={28} />
                                            <div>
                                                <div className="font-black text-lg uppercase tracking-tight">Concluding...</div>
                                                <div className="text-xs text-white/70 font-bold uppercase tracking-widest">Syncing results</div>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <div className="w-12 h-12 rounded-2xl bg-white/20 group-hover:bg-white/30 flex items-center justify-center transition-all">
                                                <Square size={24} fill="currentColor" stroke="none" />
                                            </div>
                                            <div className="text-left">
                                                <div className="text-xl font-black uppercase tracking-tight">End Mission</div>
                                                <div className="text-xs font-bold text-white/70 uppercase tracking-widest">Complete sortie</div>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </button>
                        </div>
                    )}
                </div>

                {/* GPS Status Footer */}
                <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 py-4">
                    <div className={`w-2 h-2 rounded-full ${position && position.accuracy < 20 ? 'bg-green-500' : 'bg-orange-500 animate-pulse'}`} />
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                        {position ? `GPS Accuracy: ${Math.round(position.accuracy)}m • Quality: ${trackQuality}` : 'Searching for Signal...'}
                    </span>
                    <button onClick={() => setShowGpsHelper(true)} className="px-2 py-1 rounded-lg bg-white border border-black/10 text-[9px] font-black uppercase tracking-wider text-[#1a1a2e] inline-flex items-center gap-1">
                        <Wrench size={11} /> Fix GPS
                    </button>
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

            {/* GPS Acquisition Overlay */}
            <AnimatePresence>
                {isAcquiringGps && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[3000] bg-black/40 backdrop-blur-md flex items-center justify-center p-4"
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            className="bg-white rounded-[40px] p-8 sm:p-12 max-w-md w-full shadow-2xl border-2 border-[#A8D5BA]/20"
                        >
                            {/* Animated GPS Icon */}
                            <motion.div
                                animate={{ 
                                    scale: [1, 1.2, 1],
                                    rotate: [0, 180, 360]
                                }}
                                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                                className="w-24 h-24 mx-auto mb-6 rounded-3xl bg-gradient-to-br from-[#A8D5BA] to-[#6CC89A] flex items-center justify-center shadow-2xl shadow-[#A8D5BA]/30"
                            >
                                <Crosshair size={40} className="text-white" />
                            </motion.div>

                            {/* Status Text */}
                            <div className="text-center space-y-4">
                                <h3 className="text-2xl font-black text-[#1a1a2e]">
                                    Acquiring GPS Signal
                                </h3>
                                <motion.p
                                    key={gpsAcquisitionTip}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="text-sm font-bold text-gray-500"
                                >
                                    {[
                                        "📡 Scanning for satellites...",
                                        "🗺️ Mapping nearby territory...",
                                        "⚡ Calibrating sensors...",
                                        "🎯 Locking position..."
                                    ][gpsAcquisitionTip]}
                                </motion.p>

                                {/* Animated dots */}
                                <div className="flex items-center justify-center gap-2 pt-2">
                                    {[0, 1, 2].map((i) => (
                                        <motion.div
                                            key={i}
                                            animate={{ 
                                                scale: [1, 1.5, 1],
                                                opacity: [0.3, 1, 0.3]
                                            }}
                                            transition={{
                                                duration: 1.5,
                                                repeat: Infinity,
                                                delay: i * 0.2
                                            }}
                                            className="w-3 h-3 rounded-full bg-[#A8D5BA]"
                                        />
                                    ))}
                                </div>

                                {/* Tip */}
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 1 }}
                                    className="mt-6 bg-[#F0F7F4] rounded-2xl p-4 border border-[#A8D5BA]/20"
                                >
                                    <p className="text-[10px] font-bold text-gray-600 leading-relaxed">
                                        <span className="font-black text-[#2E7D52]">TIP:</span> For best accuracy, ensure you're outdoors with a clear view of the sky. GPS works best away from tall buildings.
                                    </p>
                                </motion.div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {warmupCountdown > 0 && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[3100] bg-black/50 backdrop-blur-sm flex items-center justify-center">
                        <div className="bg-white rounded-3xl border border-black/10 p-8 text-center">
                            <p className="text-xs font-black uppercase tracking-widest text-gray-500">Warm-up</p>
                            <p className="text-6xl font-black text-[#1a1a2e] tabular-nums mt-2">{warmupCountdown}</p>
                            <p className="text-sm font-semibold text-gray-600 mt-2">Hold steady for cleaner first GPS trace</p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {showGpsHelper && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[3200] bg-black/35 p-4" onClick={() => setShowGpsHelper(false)}>
                        <div onClick={(e) => e.stopPropagation()} className="max-w-md mx-auto mt-[18vh] bg-white rounded-3xl border border-black/10 p-5 shadow-2xl">
                            <h3 className="text-sm font-black text-[#1a1a2e] mb-3">One-Tap GPS Recovery</h3>
                            <ol className="list-decimal pl-5 space-y-1 text-sm font-semibold text-gray-700">
                                <li>Move to open sky for 20-30 seconds.</li>
                                <li>Disable battery saver/location throttling.</li>
                                <li>Keep the app screen active while running.</li>
                                <li>Re-enter Run page if signal is stale for more than 20s.</li>
                            </ol>
                            <button onClick={() => setShowGpsHelper(false)} className="mt-4 w-full px-4 py-2 rounded-xl bg-[#1a1a2e] text-white text-xs font-black uppercase tracking-wider">Got it</button>
                        </div>
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
