'use client';

import React, { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Play,
    Square,
    ChevronLeft,
    Loader2,
    Zap,
    Crosshair,
    Radio,
    Search,
    Trophy,
    Footprints,
    Shield,
    X
} from 'lucide-react';
import Link from 'next/link';
import { useCallback } from 'react';
import { mutate } from 'swr';
import { useGps } from '../../hooks/useGps';
import { useStepCounter } from '../../hooks/useStepCounter';
import { useSocket } from '../../hooks/useSocket';
import { useAuthStore } from '../../store/authStore';
import api from '../../services/api';
import { toast } from 'react-hot-toast';
import MapContent from '../../components/map/MapContent';
import MapSearch from '../../components/map/MapSearch';
import FloatingLeaderboard from '../../components/map/FloatingLeaderboard';
import L from 'leaflet';

import { latLngToCell, gridDisk } from 'h3-js';



const LeafletMap = dynamic(() => import('../../components/map/LeafletMap'), { ssr: false });

const MIN_DISTANCE_METERS = 2; // More lenient for accurate tracking
const MIN_ACCURACY_METERS = 30;
const STEP_LENGTH_METERS = 0.7; // Average human step length (0.7m)

export default function MapPage() {
    const [isRunning, setIsRunning] = useState(false);
    const [runId, setRunId] = useState<string | null>(null);
    const [searchOpen, setSearchOpen] = useState(false);
    const mapInstance = useRef<L.Map | null>(null);
    const [isStarting, setIsStarting] = useState(false);
    const [isEnding, setIsEnding] = useState(false);
    const [stats, setStats] = useState({ distance: 0, time: 0, hexCount: 0, credits: 0, steps: 0 });
    const [currentTerritory, setCurrentTerritory] = useState<any>(null);
    const statsInterval = useRef<any>(null);
    const [runPath, setRunPath] = useState<[number, number][]>([]);
    const [activeRunners, setActiveRunners] = useState<Record<string, any>>({});
    const [nearestRunner, setNearestRunner] = useState<{ name: string, dist: number } | null>(null);
    const [traceQuality, setTraceQuality] = useState<'high' | 'medium' | 'low'>('medium');
    const [activePanel, setActivePanel] = useState<'leaderboard' | 'steps' | 'faction' | null>(null);
    const [followUser, setFollowUser] = useState(true);
    const isRunningRef = useRef(false);
    const runIdRef = useRef<string | null>(null);
    const hexSetRef = useRef<Set<string>>(new Set());
    const accelStepsRef = useRef(0); // Track accelerometer steps separately
    const gpsFallbackStepsRef = useRef(0); // GPS-based backup steps when accelerometer is weak
    const isDetectingRef = useRef(false);

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

    const { user, updateUser } = useAuthStore();
    const socket = useSocket('main');
    const [factionStats, setFactionStats] = useState({ red: 0, blue: 0, green: 0, total: 1 });

    useEffect(() => {
        const fetchFactionStats = async () => {
            try {
                const response = await api.get('/leaderboard/factions');
                const cities = response.data?.cities || [];
                const totals = cities.reduce((acc: any, city: any) => {
                    acc.red += city.redCount || 0;
                    acc.blue += city.blueCount || 0;
                    acc.green += city.greenCount || 0;
                    return acc;
                }, { red: 0, blue: 0, green: 0 });
                const total = Math.max(1, totals.red + totals.blue + totals.green);
                setFactionStats({ ...totals, total });
            } catch {
                // Keep last known values if request fails.
            }
        };

        fetchFactionStats();
        const interval = setInterval(fetchFactionStats, 30000);
        return () => clearInterval(interval);
    }, []);

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

    const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
        const R = 6371; // km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    };

    const lastGpsPoint = useRef<{ lat: number; lng: number; accuracy?: number } | null>(null);
    const lastGpsTs = useRef<number | null>(null);

    const handleLocateUser = useCallback((lat: number, lng: number) => {
        setFollowUser(false);
        if (mapInstance.current) {
            mapInstance.current.flyTo([lat, lng], 18, {
                duration: 1.5,
                easeLinearity: 0.25
            });
        }
    }, []);

    const handleGpsPoint = useCallback((point: { lat: number; lng: number; accuracy?: number; altitude?: number }) => {
        if (!isRunningRef.current || !runIdRef.current) return;

        // Production-grade accuracy filtering with adaptive threshold based on movement
        const accuracy = point.accuracy ?? 999;
        const quality: 'high' | 'medium' | 'low' = accuracy <= 15 ? 'high' : accuracy <= 35 ? 'medium' : 'low';
        setTraceQuality(quality);
        localStorage.setItem('tr_track_quality', quality);
        if (!lastGpsPoint.current) {
            // First point - just record it with lenient threshold
            lastGpsPoint.current = { ...point, accuracy };
            lastGpsTs.current = Date.now();
            console.log(`[GPS-START] First point: [${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}], accuracy: ${accuracy}m`);
            return;
        }

        // Adaptive accuracy threshold: 3x multiplier for better tolerance during movement
        // More forgiving for stationary (40m min) and fast movement (80m max)
        const lastAccuracy = lastGpsPoint.current.accuracy ?? accuracy;
        const maxAccuracy = Math.max(40, Math.min(lastAccuracy * 3.0, 80));
        if (accuracy > maxAccuracy) {
            console.log(`[GPS-REJECT] Poor accuracy: ${accuracy.toFixed(1)}m exceeds ${maxAccuracy.toFixed(1)}m threshold (base: ${lastAccuracy.toFixed(1)}m)`);
            return;
        }

        // Calculate validated distance with precision
        const nowTs = Date.now();
        const dtSec = Math.max(1, Math.floor((nowTs - lastGpsTs.current!) / 1000));
        const addedDistKm = getDistance(lastGpsPoint.current.lat, lastGpsPoint.current.lng, point.lat, point.lng);
        const addedDistMeters = addedDistKm * 1000;
        const speedKmh = dtSec > 0 ? (addedDistKm * 3600) / dtSec : 0;

        // Multi-layer anti-cheat validation with detailed logging
        const isTooClose = addedDistMeters < MIN_DISTANCE_METERS && dtSec < 3;
        const isTooFast = speedKmh > 50; // 50 km/h max (generous for cyclists)
        const isJump = addedDistMeters > 500 && dtSec < 5; // 500m in 5s = unrealistic teleport

        if (isTooClose) {
            console.log(`[GPS-NOISE] Point too close: ${addedDistMeters.toFixed(1)}m in ${dtSec}s (min: ${MIN_DISTANCE_METERS}m)`);
            return;
        }
        if (isTooFast) {
            console.warn(`[GPS-CHEAT] Impossible speed detected: ${speedKmh.toFixed(1)}km/h (${addedDistMeters.toFixed(0)}m in ${dtSec}s) - exceeds 50km/h limit`);
            return;
        }
        if (isJump) {
            console.warn(`[GPS-CHEAT] Teleport detected: ${addedDistMeters.toFixed(0)}m in ${dtSec}s - unrealistic jump`);
            return;
        }

        // Point validated - update reference ONLY after all checks pass
        lastGpsPoint.current = { ...point, accuracy };
        lastGpsTs.current = nowTs;
        localStorage.setItem('tr_last_gps_ts', String(nowTs));
        const addedDist = addedDistKm;

        // Broadcast to other connected users with enhanced data
        socket?.emit('presence_sync', {
            lat: point.lat,
            lng: point.lng,
            accuracy: accuracy,
            speed: speedKmh,
            timestamp: nowTs
        });

        socket?.emit('gps_update', {
            runId: runIdRef.current,
            lat: point.lat,
            lng: point.lng,
            accuracy: accuracy,
            altitude: point.altitude,
            speed: speedKmh,
            timestamp: nowTs
        });

        // Territory tracking via H3 grid
        try {
            const h3Index = latLngToCell(point.lat, point.lng, 9);
            const isNew = !hexSetRef.current.has(h3Index);
            hexSetRef.current.add(h3Index);
            if (isNew) console.log(`[HEX] Territory discovered: ${h3Index.slice(-6)}, total: ${hexSetRef.current.size}`);
        } catch (err) { 
            console.error('[HEX-ERROR]', err);
        }

        // Visual path trail with smart deduplication
        setRunPath(prev => {
            const last = prev[prev.length - 1];
            // Stricter deduplication: 0.1m threshold (0.00001° ≈ 1.1m)
            if (last && Math.abs(last[0] - point.lat) < 0.00001 && Math.abs(last[1] - point.lng) < 0.00001) {
                console.log(`[PATH] Skipping duplicate point at [${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}]`);
                return prev; // Skip duplicates
            }
            const newPath: [number, number][] = [...prev, [point.lat, point.lng]];
            console.log(`[PATH] Added point #${newPath.length}: [${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}], accuracy: ${accuracy.toFixed(1)}m, speed: ${speedKmh.toFixed(1)}km/h`);
            return newPath;
        });

        // CRITICAL: Update stats with validated distance only
        setStats(prev => {
            const newDist = parseFloat((prev.distance + addedDist).toFixed(6));
            const newHexCount = hexSetRef.current.size;
            
            // Step logic: accelerometer primary + GPS fallback without double counting
            let newSteps = Math.max(accelStepsRef.current, gpsFallbackStepsRef.current);
            const shouldUseGpsFallback = !isDetectingRef.current || accelStepsRef.current < 5;
            if (shouldUseGpsFallback && addedDistMeters > 6) {
                const gpsSteps = Math.floor(addedDistMeters / STEP_LENGTH_METERS);
                if (gpsSteps > 0) {
                    gpsFallbackStepsRef.current += gpsSteps;
                    newSteps = Math.max(newSteps, gpsFallbackStepsRef.current);
                }
            }

            // Guardrail: cap noisy accelerometer spikes using distance-derived expectation.
            const expectedFromDistance = Math.max(0, Math.round((newDist * 1000) / STEP_LENGTH_METERS));
            if (expectedFromDistance > 0) {
                const maxAllowed = Math.round(expectedFromDistance * 1.45);
                newSteps = Math.min(newSteps, maxAllowed);
            }
            
            const newCredits = Math.floor(newDist * 12) + (newHexCount * 2);

            if (addedDist > 0.0005) {
                console.log(`[STATS] Dist: ${newDist.toFixed(3)}km | Hex: ${newHexCount} | Steps: ${newSteps} | TRC: ${newCredits}`);
            }

            return {
                ...prev,
                distance: newDist,
                hexCount: newHexCount,
                credits: newCredits,
                steps: newSteps,
            };
        });
    }, [socket]);

    const handleGpsUpdate = useCallback((state: any) => {
        if (state.lat !== null && state.lng !== null) {
            handleGpsPoint({
                lat: state.lat,
                lng: state.lng,
                accuracy: state.accuracy ?? undefined,
                altitude: state.altitude ?? undefined
            });
        }
    }, [handleGpsPoint]);

    const { position, error: gpsError, start: startGps, stop: stopGps, updatePosition } = useGps({
        enabled: true,
        onUpdate: handleGpsUpdate
    });

    // Initialize step counter with accelerometer
    const { stepRate, cadence, isDetecting, start: startStepCounter, stop: stopStepCounter, reset: resetStepCounter } = useStepCounter({
        enabled: true,
        useAccelerometer: true,
        onUpdate: (state) => {
            // Update stats with accelerometer-detected steps
            accelStepsRef.current = state.steps; // Store accelerometer steps
            isDetectingRef.current = state.isDetecting;
            setStats(prev => {
                const newSteps = Math.max(state.steps, gpsFallbackStepsRef.current);
                return {
                    ...prev,
                    steps: newSteps,
                };
            });
        }
    });

    const userCenter = React.useMemo<[number, number]>(() => {
        if (position?.lat && position?.lng) return [position.lat, position.lng];
        return initialMapView.center;
    }, [position?.lat, position?.lng, initialMapView.center]);



    useEffect(() => {
        const checkActiveRun = async () => {
            try {
                const { data } = await api.get('/run/active');
                if (data.activeRun) {
                    const run = data.activeRun;
                    setRunId(run._id);
                    runIdRef.current = run._id;
                    setIsRunning(true);
                    isRunningRef.current = true;
                    hexSetRef.current = new Set(); // Reset/Init hexes
                    const startedAt = new Date(run.startedAt).getTime();
                    const elapsedSeconds = Math.floor((Date.now() - startedAt) / 1000);
                    setStats({
                        distance: run.distanceKm || 0,
                        time: elapsedSeconds,
                        hexCount: run.hexesTotal || 0,
                        credits: Math.floor((run.hexesTotal || 0) * 1.5),
                        steps: Math.max(0, Math.round((run.distanceKm || 0) * 1312)),
                    });
                    accelStepsRef.current = Math.max(0, Math.round((run.distanceKm || 0) * 1312));
                    gpsFallbackStepsRef.current = accelStepsRef.current;
                    // Enable follow mode for live tracking when resuming run
                    setFollowUser(true);
                    localStorage.setItem('tr_run_session', JSON.stringify({
                        active: true,
                        startedAt,
                        distance: run.distanceKm || 0,
                        steps: Math.max(0, Math.round((run.distanceKm || 0) * 1312)),
                    }));
                    startTimer();
                    startGps();
                    startStepCounter();
                    toast.success('Active Mission Detected: Resuming Uplink');
                }
            } catch (error) { /* No active run */ }
        };
        checkActiveRun();
        return () => stopTimer();
    }, [startTimer, stopTimer, startStepCounter]);

    // HEARTBEAT: Ensure visibility even when stationary
    useEffect(() => {
        if (!socket) return;
        const heartbeat = setInterval(() => {
            if (lastGpsPoint.current) {
                socket.emit('presence_sync', {
                    lat: lastGpsPoint.current.lat,
                    lng: lastGpsPoint.current.lng,
                    accuracy: 10
                });
            }
        }, 8000);
        return () => clearInterval(heartbeat);
    }, [socket]);

    const startRun = async () => {
        if (!position) return;
        setIsStarting(true);
        try {
            const { data } = await api.post('/run/start', {
                startPos: { lat: position.lat, lng: position.lng }
            });

            setRunId(data.run._id);
            runIdRef.current = data.run._id;

            setIsRunning(true);
            isRunningRef.current = true;

            hexSetRef.current = new Set();
            setRunPath([]);
            setStats({ distance: 0, time: 0, hexCount: 0, credits: 0, steps: 0 });
            accelStepsRef.current = 0;
            gpsFallbackStepsRef.current = 0;
            lastGpsPoint.current = null;
            lastGpsTs.current = null;
            resetStepCounter();
            startTimer();
            startGps();
            startStepCounter();
            socket?.emit('run_start', { runId: data.run._id, lat: position.lat, lng: position.lng });
            localStorage.setItem('tr_run_session', JSON.stringify({
                active: true,
                startedAt: Date.now(),
                distance: 0,
                steps: 0,
            }));
        } catch (error: any) {
            const errorMessage = error.response?.data?.error || 'Could not initialize campaign. Check linkage.';
            toast.error(errorMessage);
        } finally { setIsStarting(false); }
    };

    const endRun = async (attemptNumber = 1) => {
        if (!runId || !position) return;
        setIsEnding(true);
        const MAX_RETRIES = 3;
        
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout
            
            const { data } = await api.post(`/run/${runId}/end`, {
                lat: position.lat,
                lng: position.lng,
                accelSteps: Math.max(stats.steps || 0, accelStepsRef.current, gpsFallbackStepsRef.current)
            }, { 
                signal: controller.signal,
                timeout: 60000 
            });

            clearTimeout(timeoutId);

            if (data?.user) {
                updateUser({
                    city: data.user.city,
                    credits: data.user.credits,
                    hexesOwned: data.user.hexesOwned,
                    rank: data.user.globalRank ? String(data.user.globalRank) : undefined,
                    stats: data.user.stats,
                });
            }

            const userCity = user?.city || data?.user?.city;
            const refreshKeys = [
                '/auth/me',
                '/leaderboard/me',
                '/leaderboard/global',
                '/leaderboard/24hour',
                '/run/history/me',
                '/leaderboard/enhanced-stats',
                '/leaderboard/top-commanders',
                '/leaderboard/city-activity',
                '/leaderboard/recent-wins',
            ];

            if (userCity) {
                refreshKeys.push(`/leaderboard/city/${userCity}`);
                refreshKeys.push(`/leaderboard/24hour/city/${userCity}`);
            }

            await Promise.all(refreshKeys.map((key) => mutate(key)));
            await mutate((key) => typeof key === 'string' && key.startsWith('/map/path-traces'));

            setIsRunning(false);
            isRunningRef.current = false;
            setRunId(null);
            runIdRef.current = null;
            stopGps();
            stopStepCounter();
            stopTimer();

            // Show results and update leaderboard
            const summary = data?.summary || {};
            toast.success(`Campaign Concluded • ${summary.hexesClaimed || 0} claims • ${summary.creditsEarned || 0} credits`);

            // Soft reset stats for next run
            setStats({ distance: 0, time: 0, hexCount: 0, credits: 0, steps: 0 });
            accelStepsRef.current = 0;
            gpsFallbackStepsRef.current = 0;
            lastGpsTs.current = null;
            localStorage.setItem('tr_run_session', JSON.stringify({ active: false }));
            setIsEnding(false);
        } catch (error: any) {
            // Retry logic with exponential backoff
            if (attemptNumber < MAX_RETRIES && (error.code === 'ABORT_ERR' || error.response?.status >= 500)) {
                const delayMs = Math.min(1000 * Math.pow(2, attemptNumber - 1), 10000);
                // Retry silently without showing toast
                setTimeout(() => {
                    endRun(attemptNumber + 1);
                }, delayMs);
            } else {
                const errorMsg = error.response?.data?.error || 'Uplink failed. Mission may have saved. Check leaderboard.';
                toast.error(errorMsg);
                setIsEnding(false);
            }
        }
    };

    useEffect(() => {
        if (!socket) return;

        socket.on('live_runner', (data: any) => {
            // Ignore our own updates
            if (data.userId === user?.id) return;
            if (!data.lat || !data.lng) return;

            setActiveRunners(prev => {
                const existing = prev[data.userId];
                const newPath = existing?.path || [];
                
                // Append new point to path (limit to last 100 points to avoid memory issues)
                if (newPath.length === 0 || 
                    getDistance(newPath[newPath.length - 1][0], newPath[newPath.length - 1][1], data.lat, data.lng) > 0.005) {
                    newPath.push([data.lat, data.lng]);
                    if (newPath.length > 100) newPath.shift();
                }

                return {
                    ...prev,
                    [data.userId]: {
                        userId: data.userId,
                        username: data.username,
                        lat: data.lat,
                        lng: data.lng,
                        userColor: data.userColor || '#FFD6A5',
                        faction: data.faction,
                        path: newPath,
                        lastSeen: Date.now(),
                    }
                };
            });
        });

        // Also listen on global_live_runner for cross-zone runners
        socket.on('global_live_runner', (data: any) => {
            if (data.userId === user?.id) return;
            if (!data.lat || !data.lng) return;

            setActiveRunners(prev => {
                const existing = prev[data.userId];
                const newPath = existing?.path || [];
                
                // Append new point to path (limit to last 100 points)
                if (newPath.length === 0 || 
                    getDistance(newPath[newPath.length - 1][0], newPath[newPath.length - 1][1], data.lat, data.lng) > 0.005) {
                    newPath.push([data.lat, data.lng]);
                    if (newPath.length > 100) newPath.shift();
                }

                return {
                    ...prev,
                    [data.userId]: {
                        userId: data.userId,
                        username: data.username,
                        lat: data.lat,
                        lng: data.lng,
                        userColor: data.userColor || '#FFD6A5',
                        faction: data.faction,
                        path: newPath,
                        lastSeen: Date.now(),
                    }
                };
            });

            // Calculate distance to this runner if we are running
            if (isRunningRef.current && position?.lat !== null && position?.lng !== null) {
                const d = getDistance(position.lat as number, position.lng as number, data.lat, data.lng);
                if (d < 0.2) { // Within 200m
                    setNearestRunner({ name: data.username, dist: d * 1000 });
                } else {
                    setNearestRunner(null);
                }
            }
        });

        // Enhanced stale runner cleanup with adaptive timeout and detailed logging
        const cleanup = setInterval(() => {
            const now = Date.now();
            setActiveRunners(prev => {
                const next = { ...prev };
                let changed = false;
                Object.keys(next).forEach(id => {
                    const age = now - next[id].lastSeen;
                    // Adaptive timeout: 120s base, extended to 180s for active runners
                    const timeoutMs = isRunningRef.current ? 180000 : 120000;
                    
                    if (age > timeoutMs) {
                        console.log(
                            `[Cleanup] Removing stale runner ${next[id].username} (${id.slice(-6)}), ` +
                            `last seen ${Math.floor(age / 1000)}s ago (threshold: ${timeoutMs / 1000}s)`
                        );
                        delete next[id];
                        changed = true;
                    }
                });
                return changed ? next : prev;
            });
        }, 15000); // Check every 15s for responsive cleanup

        // Listen for faction changes with comprehensive UI updates
        socket.on('faction_updated', (data: any) => {
            console.log('[Map] Faction updated:', data);
            
            // Update activeRunners if this user is currently being tracked
            if (data.userId) {
                setActiveRunners(prev => {
                    if (prev[data.userId]) {
                        return {
                            ...prev,
                            [data.userId]: {
                                ...prev[data.userId],
                                faction: data.faction,
                                color: data.color || prev[data.userId].color,
                                username: data.username || prev[data.userId].username
                            }
                        };
                    }
                    return prev;
                });
            }
            
            // If the faction change is for the current user
            if (data.userId === user?.id) {
                console.log('[Map] Current user faction changed to', data.faction);
                
                // Show detailed toast notification
                const factionNames: Record<string, string> = {
                    red: 'Red Legion 🔴',
                    blue: 'Blue Syndicate 🔵',
                    green: 'Green Nomads 🟢'
                };
                
                const message = data.isChange 
                    ? `Faction changed to ${factionNames[data.faction] || data.faction}!`
                    : `Joined ${factionNames[data.faction] || data.faction}!`;
                
                toast.success(message, {
                    duration: 4000,
                    icon: data.isChange ? '🔄' : '⚡'
                });
                
                // Optional: Refresh territories or map data to reflect faction change
                // mutate('/map/territories') if using SWR
            } else {
                // Another user changed faction - show subtle notification
                const factionNames: Record<string, string> = {
                    red: 'Red Legion',
                    blue: 'Blue Syndicate',
                    green: 'Green Nomads'
                };
                console.log(`[Map] ${data.username} ${data.isChange ? 'switched to' : 'joined'} ${factionNames[data.faction]}`);
            }
        });

        return () => {
            socket.off('live_runner');
            socket.off('global_live_runner');
            socket.off('faction_updated');
            clearInterval(cleanup);
        };
    }, [socket, user?.id]); // no position dependency — was causing stale closures

    useEffect(() => {
        if (!socket) return;

        const onDailyReset = (payload: any) => {
            const winners = payload?.winners || [];
            const podium = winners.map((winner: any) => `#${winner.rank} ${winner.username}`).join(' • ');

            // Reset local active run visuals for a clean new day
            setRunPath([]);
            setStats({ distance: 0, time: 0, hexCount: 0, credits: 0, steps: 0 });
            accelStepsRef.current = 0;
            gpsFallbackStepsRef.current = 0;
            setCurrentTerritory(null);

            if (podium) {
                toast.success(`Daily Reset • Winners: ${podium}`);
            } else {
                toast.success('Daily Reset completed');
            }
        };

        socket.on('daily_reset', onDailyReset);
        return () => {
            socket.off('daily_reset', onDailyReset);
        };
    }, [socket]);

    // Join map zone rooms so we receive other runners' updates
    useEffect(() => {
        if (!socket || !position?.lat || !position?.lng) return;

        try {
            // Join the H3 parent zone (resolution 6 = broad area)
            const centerHex = latLngToCell(position.lat, position.lng, 6);
            const nearbyZones = gridDisk(centerHex, 1); // center + 6 neighbors

            nearbyZones.forEach((zone: string) => {
                socket.emit('join_map_zone', zone);
            });

            return () => {
                nearbyZones.forEach((zone: string) => {
                    socket.emit('leave_map_zone', zone);
                });
            };
        } catch (err) {
            console.error('[MapZone] Failed to join zones:', err);
        }
    }, [socket,
        position?.lat ? Math.round(position.lat * 200) / 200 : null,
        position?.lng ? Math.round(position.lng * 200) / 200 : null
    ]);


    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    useEffect(() => {
        if (!isRunningRef.current) return;
        localStorage.setItem('tr_run_session', JSON.stringify({
            active: true,
            startedAt: Date.now() - (stats.time * 1000),
            distance: stats.distance,
            steps: stats.steps,
        }));
    }, [stats.time, stats.distance, stats.steps]);

    const signalLabel = position && position.accuracy !== null
        ? `GPS: ${Math.round(position.accuracy)}m • ${traceQuality}`
        : 'GPS: No GPS • Quality: medium';

    return (
        <div className="h-screen w-full flex flex-col overflow-hidden relative bg-[#F4F7F4]">
            {/* Top UI Overlays */}
            <div className="absolute top-4 left-4 z-[1000] pointer-events-none">
                <Link href="/dashboard" className="p-3 bg-white/90 backdrop-blur-md rounded-2xl border border-black/5 shadow-lg active:scale-95 transition-all pointer-events-auto text-[#1a1a2e] hover:text-[#2E7D52] inline-flex">
                    <ChevronLeft size={24} />
                </Link>
            </div>

            {/* Left Feature Rail */}
            <div className="absolute left-4 top-24 z-[1000] flex flex-col gap-3 pointer-events-none">
                <MapControlButton
                    icon={<Search size={18} />}
                    onClick={() => setSearchOpen(true)}
                    title="Search"
                    transparent
                />
                <MapControlButton
                    icon={<Trophy size={18} />}
                    title="Leaderboard"
                    transparent
                    active={activePanel === 'leaderboard'}
                    onClick={() => setActivePanel(activePanel === 'leaderboard' ? null : 'leaderboard')}
                />
                <MapControlButton
                    icon={<Footprints size={18} />}
                    title="Step Counter"
                    transparent
                    active={activePanel === 'steps'}
                    onClick={() => setActivePanel(activePanel === 'steps' ? null : 'steps')}
                />
                <MapControlButton
                    icon={<Shield size={18} />}
                    title="Faction War"
                    transparent
                    active={activePanel === 'faction'}
                    onClick={() => setActivePanel(activePanel === 'faction' ? null : 'faction')}
                />
            </div>

            <AnimatePresence>
                {activePanel && (
                    <motion.div
                        initial={{ x: -20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: -20, opacity: 0 }}
                        className="absolute left-20 top-24 z-[1000] w-[min(360px,calc(100vw-6.5rem))] pointer-events-auto"
                    >
                        <div className="bg-white/80 backdrop-blur-xl border border-white/60 shadow-2xl rounded-3xl overflow-hidden">
                            <div className="px-4 py-3 border-b border-black/5 flex items-center justify-between">
                                <div className="text-xs font-black uppercase tracking-widest text-[#1a1a2e]">
                                    {activePanel === 'leaderboard' && 'Live Leaderboard'}
                                    {activePanel === 'steps' && 'Step Counter'}
                                    {activePanel === 'faction' && 'Faction War'}
                                </div>
                                <button
                                    onClick={() => setActivePanel(null)}
                                    title="Close panel"
                                    className="w-8 h-8 rounded-xl bg-white border border-black/10 flex items-center justify-center text-gray-500 hover:text-[#1a1a2e]"
                                >
                                    <X size={16} />
                                </button>
                            </div>

                            <div className="p-3">
                                {activePanel === 'leaderboard' && <FloatingLeaderboard embedded />}

                                {activePanel === 'steps' && (
                                    <div className="rounded-2xl border border-black/10 bg-[#F8FAF8] p-4 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <div className="text-[10px] font-black uppercase tracking-widest text-[#2E7D52]">Live Steps</div>
                                            <div className={`w-2 h-2 rounded-full ${isDetecting ? 'bg-[#2E7D52] animate-pulse' : 'bg-gray-300'}`} />
                                        </div>
                                        <div className="text-4xl font-black tabular-nums text-[#2E7D52]">{stats.steps.toLocaleString()}</div>
                                        <div className="grid grid-cols-2 gap-2 text-xs">
                                            <div className="rounded-xl bg-white p-3 border border-black/5">
                                                <div className="text-gray-500 font-bold uppercase text-[9px]">Cadence</div>
                                                <div className="text-lg font-black text-[#1a1a2e]">{cadence}</div>
                                            </div>
                                            <div className="rounded-xl bg-white p-3 border border-black/5">
                                                <div className="text-gray-500 font-bold uppercase text-[9px]">Rate</div>
                                                <div className="text-lg font-black text-[#1a1a2e]">{stepRate}</div>
                                            </div>
                                        </div>
                                        <div className="text-[10px] font-bold text-gray-500">{signalLabel}</div>
                                    </div>
                                )}

                                {activePanel === 'faction' && (
                                    <div className="rounded-2xl border border-black/10 bg-[#F8FAF8] p-4 space-y-3">
                                        <FactionRow label="Red Legion" value={factionStats.red} total={factionStats.total} color="bg-red-500" />
                                        <FactionRow label="Blue Syndicate" value={factionStats.blue} total={factionStats.total} color="bg-blue-500" />
                                        <FactionRow label="Green Nomads" value={factionStats.green} total={factionStats.total} color="bg-green-500" />
                                    </div>
                                )}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {searchOpen && (
                    <MapSearch
                        onClose={() => setSearchOpen(false)}
                        activeRunners={activeRunners}
                        onLocate={handleLocateUser}
                    />
                )}
            </AnimatePresence>

            {/* Map Body */}
            <div className="flex-1 relative z-0">
                <LeafletMap
                    center={userCenter}
                    zoom={isRunning ? 18 : 16}
                    onMapReady={(map) => { mapInstance.current = map; }}
                    followUser={followUser}
                    onManualMove={() => setFollowUser(false)}
                >
                    <MapContent
                        isRunning={isRunning}
                        runPath={runPath}
                        userColor={user?.color || '#A8D5BA'}
                        traceQuality={traceQuality}
                        position={position}
                        accuracy={position?.accuracy || 10}
                        activeRunners={activeRunners}
                        stepCount={stats.steps}
                        stepRate={stepRate}
                        onCurrentTerritoryChange={setCurrentTerritory}
                    />
                </LeafletMap>

                {/* Recenter Button */}
                {!followUser && position?.lat && (
                    <motion.button
                        initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
                        onClick={() => {
                            setFollowUser(true);
                            handleLocateUser(position.lat!, position.lng!);
                        }}
                        className="absolute bottom-24 right-4 z-[1000] w-12 h-12 bg-[#2E7D52] text-white rounded-2xl shadow-xl flex items-center justify-center active:scale-95 transition-all"
                    >
                        <Crosshair size={24} />
                    </motion.button>
                )}

                {(!position?.lat || !position?.lng) && !gpsError && (
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[500] pointer-events-none">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                            className="bg-white/90 backdrop-blur-xl p-8 rounded-[32px] border border-black/5 shadow-2xl flex flex-col items-center gap-4"
                        >
                            <div className="relative">
                                <Loader2 className="animate-spin text-[#A8D5BA]" size={48} />
                                <div className="absolute inset-0 bg-[#A8D5BA] opacity-10 blur-xl rounded-full" />
                            </div>
                            <div className="text-center">
                                <h2 className="text-lg font-black text-[#1a1a2e] tracking-tight">Initializing Sat-Link</h2>
                                <p className="text-gray-400 text-[9px] font-black uppercase tracking-widest mt-1">Acquiring Lock...</p>
                            </div>
                        </motion.div>
                    </div>
                )}
            </div>

            {/* Bottom Controls */}
            <div className="absolute bottom-8 left-4 right-4 z-[1000] flex flex-col items-center gap-4 pointer-events-none">
                <AnimatePresence>
                    {isRunning && (
                        <>
                            {/* Run Stats Bar */}
                            <motion.div
                                initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }}
                                className="bg-white/90 backdrop-blur-md rounded-[32px] border border-black/5 shadow-2xl p-6 w-full max-w-xl pointer-events-auto grid grid-cols-5 items-center"
                            >
                                <StatItem label="Chrono" value={formatTime(stats.time)} color="text-[#1a1a2e]" />
                                <StatItem label="KM" value={stats.distance.toFixed(3)} color="text-[#1a1a2e]" />
                                <StatItem label="Hexes" value={stats.hexCount} color="text-[#2E7D52]" icon={<Crosshair size={10} />} />
                                <StatItem label="Yield" value={stats.credits} color="text-[#A594D3]" icon={<Zap size={10} />} />
                                <StatItem label="Territory" value={currentTerritory?.ownerUsername?.substring(0, 8) || 'Wild'} color="text-[#2E7D52]" />

                                {nearestRunner && (
                                    <div className="absolute -top-16 left-1/2 -translate-x-1/2 bg-red-500 text-white px-4 py-2 rounded-full font-black text-[10px] uppercase shadow-xl animate-bounce border-2 border-white flex items-center gap-2">
                                        <Zap size={12} fill="white" />
                                        Conflict: {nearestRunner.dist.toFixed(0)}m from {nearestRunner.name}
                                    </div>
                                )}
                            </motion.div>
                        </>
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
                            onClick={() => endRun()}
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

function MapControlButton({ icon, transparent, active, title, ...rest }: any) {
    return (
        <button
            type="button"
            {...rest}
            title={title}
            className={`w-12 h-12 rounded-2xl border shadow-lg flex items-center justify-center active:scale-95 transition-all pointer-events-auto ${
                transparent
                    ? `backdrop-blur-md border-white/60 ${active ? 'bg-[#2E7D52] text-white' : 'bg-white/35 text-[#1a1a2e] hover:bg-white/55'}`
                    : 'bg-white border-black/5 text-[#1a1a2e] hover:text-[#2E7D52]'
            }`}
        >
            {icon}
        </button>
    );
}

function FactionRow({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
    const pct = Math.max(0, Math.min(100, Math.round((value / Math.max(1, total)) * 100)));
    return (
        <div className="space-y-1">
            <div className="flex items-center justify-between text-[11px] font-bold text-[#1a1a2e]">
                <span>{label}</span>
                <span>{pct}%</span>
            </div>
            <div className="h-2 rounded-full bg-black/10 overflow-hidden">
                <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
            </div>
        </div>
    );
}
