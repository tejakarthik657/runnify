'use client';

import React, { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Play,
    Square,
    Navigation,
    ChevronLeft,
    Loader2,
    Zap,
    Crosshair,
    Radio,
    Search,
    Map as MapIcon,
    Layers,
    History
} from 'lucide-react';
import Link from 'next/link';
import { useGps } from '../../hooks/useGps';
import { useSocket } from '../../hooks/useSocket';
import api from '../../services/api';
import { toast } from 'react-hot-toast';
import Badge from '../../components/ui/Badge';

const LeafletMap = dynamic(() => import('../../components/map/LeafletMap'), { ssr: false });
const TerritoryLayer = dynamic(() => import('../../components/map/TerritoryLayer'), { ssr: false });

export default function MapPage() {
    const [isRunning, setIsRunning] = useState(false);
    const [runId, setRunId] = useState<string | null>(null);
    const [isStarting, setIsStarting] = useState(false);
    const [isEnding, setIsEnding] = useState(false);
    const [stats, setStats] = useState({ distance: 0, time: 0, hexCount: 0, credits: 0 });
    const statsInterval = useRef<any>(null);

    const [initialMapView] = useState<{ center: [number, number]; zoom: number }>(() => {
        try {
            const saved = localStorage.getItem('homeLocation');
            if (saved) {
                const parsed = JSON.parse(saved);
                if (Number.isFinite(parsed?.lat) && Number.isFinite(parsed?.lng)) {
                    return { center: [parsed.lat, parsed.lng], zoom: 14 };
                }
            }
        } catch { /* fallback */ }
        return { center: [20, 0], zoom: 3 };
    });

    const { position, error: gpsError } = useGps(true);
    const socket = useSocket('main');

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
                        credits: Math.floor((run.hexesTotal || 0) * 1.5)
                    });
                    statsInterval.current = setInterval(() => {
                        setStats(prev => ({ ...prev, time: prev.time + 1 }));
                    }, 1000);
                    toast.success('Active Mission Detected: Resuming Uplink');
                }
            } catch (error) { /* No active run */ }
        };
        checkActiveRun();
        return () => { if (statsInterval.current) clearInterval(statsInterval.current); };
    }, []);

    const startRun = async () => {
        if (!position) return;
        setIsStarting(true);
        try {
            const { data } = await api.post('/run/start', {
                startPos: { lat: position.lat, lng: position.lng }
            });
            setRunId(data.run._id);
            setIsRunning(true);
            statsInterval.current = setInterval(() => {
                setStats(prev => ({ ...prev, time: prev.time + 1 }));
            }, 1000);
            socket?.emit('run_start', { runId: data.run._id, lat: position.lat, lng: position.lng });
        } catch (error: any) {
            toast.error('Could not initialize campaign. Check linkage.');
        } finally { setIsStarting(false); }
    };

    const endRun = async () => {
        if (!runId || !position) return;
        setIsEnding(true);
        try {
            await api.post(`/run/${runId}/end`, {
                endPos: { lat: position.lat, lng: position.lng }
            });
            setIsRunning(false);
            setRunId(null);
            if (statsInterval.current) clearInterval(statsInterval.current);
            setStats({ distance: 0, time: 0, hexCount: 0, credits: 0 });
            toast.success('Campaign Concluded. Intel synchronization complete.');
        } catch (error: any) {
            toast.error('Uplink failed. Retrying sync...');
        } finally { setIsEnding(false); }
    };

    useEffect(() => {
        if (isRunning && runId && position && socket) {
            socket.emit('gps_update', {
                runId, lat: position.lat, lng: position.lng, accuracy: position.accuracy
            });
        }
    }, [isRunning, runId, position, socket]);

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    return (
        <div className="h-screen w-screen flex flex-col overflow-hidden relative bg-[#F4F7F4]">
            {/* Top UI Overlays */}
            <div className="absolute top-4 left-4 right-4 z-[1000] flex flex-col gap-3 pointer-events-none">
                <div className="flex items-center justify-between w-full">
                    <Link href="/dashboard" className="p-3 bg-white rounded-2xl border border-black/5 shadow-lg active:scale-95 transition-all pointer-events-auto text-[#1a1a2e] hover:text-[#2E7D52]">
                        <ChevronLeft size={24} />
                    </Link>

                    <div className="flex bg-white rounded-2xl border border-black/5 shadow-lg px-4 py-2 items-center gap-3 pointer-events-auto">
                        <div className={`w-2 h-2 rounded-full ${position && position.accuracy < 20 ? 'bg-green-500' : 'bg-orange-500 animate-pulse'}`} />
                        <span className="text-[11px] font-black text-[#1a1a2e] tracking-tight">
                            {position ? `Signal: ${Math.round(position.accuracy)}m` : 'Locating Satellites...'}
                        </span>
                    </div>
                </div>

                <div className="flex gap-2">
                    <div className="bg-white/90 backdrop-blur-md rounded-2xl border border-black/5 shadow-lg p-4 pointer-events-auto flex items-center gap-4 flex-1 max-w-xs">
                        <div className="w-10 h-10 rounded-xl bg-[#F0F7F4] flex items-center justify-center text-[#2E7D52]">
                            <MapIcon size={20} />
                        </div>
                        <div>
                            <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Active Grid</div>
                            <div className="text-sm font-extrabold text-[#1a1a2e]">Central_Sector_9</div>
                        </div>
                    </div>

                    <AnimatePresence>
                        {isRunning && (
                            <motion.div
                                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
                                className="bg-white/90 backdrop-blur-md rounded-2xl border border-[#F4B8C1]/30 shadow-lg p-4 pointer-events-auto border-l-4 border-l-[#E89BA5]"
                            >
                                <div className="text-[10px] font-black text-[#E89BA5] uppercase tracking-widest">Live Sortie</div>
                                <div className="text-sm font-extrabold text-[#1a1a2e] flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-[#E89BA5] animate-pulse" />
                                    Active
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Float Menu (Right) */}
            <div className="absolute right-4 top-1/2 -translate-y-1/2 z-[1000] flex flex-col gap-3 pointer-events-none">
                <MapControlButton icon={<Search size={22} />} />
                <MapControlButton icon={<Layers size={22} />} />
                <MapControlButton icon={<History size={22} />} />
            </div>

            {/* Map Body */}
            <div className="flex-1 relative z-0">
                <LeafletMap
                    center={position ? [position.lat, position.lng] : initialMapView.center}
                    zoom={position ? 16 : initialMapView.zoom}
                >
                    <TerritoryLayer />
                </LeafletMap>

                {!position && !gpsError && (
                    <div className="absolute inset-0 z-[1001] flex items-center justify-center bg-white/60 backdrop-blur-sm">
                        <div className="text-center">
                            <div className="relative mb-6 inline-block">
                                <Loader2 className="animate-spin text-[#A8D5BA]" size={56} />
                                <div className="absolute inset-0 bg-[#A8D5BA] opacity-10 blur-xl rounded-full" />
                            </div>
                            <h2 className="text-xl font-black text-[#1a1a2e] tracking-tight">Initializing Sat-Link</h2>
                            <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mt-2">Synchronizing with position grid...</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Bottom Controls */}
            <div className="absolute bottom-8 left-4 right-4 z-[1000] flex flex-col items-center gap-6 pointer-events-none">
                <AnimatePresence>
                    {isRunning && (
                        <motion.div
                            initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }}
                            className="bg-white/90 backdrop-blur-md rounded-[32px] border border-black/5 shadow-2xl p-6 w-full max-w-lg pointer-events-auto grid grid-cols-4 items-center"
                        >
                            <StatItem label="Chrono" value={formatTime(stats.time)} color="text-[#1a1a2e]" />
                            <StatItem label="KM" value={stats.distance.toFixed(2)} color="text-[#1a1a2e]" />
                            <StatItem label="Hexes" value={stats.hexCount} color="text-[#2E7D52]" icon={<Crosshair size={10} />} />
                            <StatItem label="Yield" value={stats.credits} color="text-[#A594D3]" icon={<Zap size={10} />} />
                        </motion.div>
                    )}
                </AnimatePresence>

                <div className="pointer-events-auto">
                    {!isRunning ? (
                        <button
                            onClick={startRun}
                            disabled={isStarting || !!gpsError}
                            className="group relative flex items-center justify-center h-20 w-20 bg-[#A8D5BA] rounded-[28px] shadow-[0_12px_32px_rgba(168,213,186,0.4)] active:scale-95 transition-all text-white"
                        >
                            {isStarting ? (
                                <Loader2 className="animate-spin" size={32} />
                            ) : (
                                <Play size={32} fill="currentColor" stroke="none" />
                            )}
                        </button>
                    ) : (
                        <button
                            onClick={endRun}
                            disabled={isEnding}
                            className="group h-20 w-20 bg-[#F4B8C1] rounded-[28px] shadow-[0_12px_32px_rgba(244,184,193,0.4)] active:scale-95 transition-all flex flex-col items-center justify-center text-[#c0392b]"
                        >
                            {isEnding ? (
                                <Loader2 className="animate-spin" size={32} />
                            ) : (
                                <Square size={28} fill="currentColor" stroke="none" />
                            )}
                        </button>
                    )}
                </div>
            </div>

            {/* Alerts */}
            <AnimatePresence>
                {gpsError && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                        className="absolute top-24 left-1/2 -translate-x-1/2 z-[1002] bg-[#E89BA5] px-6 py-4 rounded-2xl flex items-center gap-4 text-white font-black uppercase text-[10px] tracking-widest shadow-xl"
                    >
                        <Radio size={18} className="animate-pulse" />
                        Uplink Interrupted: {gpsError}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

function StatItem({ label, value, color, icon }: any) {
    return (
        <div className="flex flex-col items-center justify-center">
            <span className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1 flex items-center gap-1">
                {icon} {label}
            </span>
            <div className={`text-xl font-black tracking-tighter ${color}`}>
                {value}
            </div>
        </div>
    );
}

function MapControlButton({ icon }: any) {
    return (
        <button className="w-12 h-12 bg-white rounded-2xl border border-black/5 shadow-lg flex items-center justify-center text-[#1a1a2e] hover:text-[#2E7D52] active:scale-95 transition-all pointer-events-auto">
            {icon}
        </button>
    );
}
