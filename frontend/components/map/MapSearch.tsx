'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, MapPin, Zap, User } from 'lucide-react';
import api from '../../services/api';
import { toast } from 'react-hot-toast';

interface RunnerData {
    userId: string;
    username: string;
    lat: number;
    lng: number;
    userColor: string;
    lastSeen: number;
}

interface UserResult {
    id: string;
    username: string;
    color: string;
    isRunningNow: boolean;
    lastPosition?: { lat: number; lng: number };
    totalHexes: number;
    city?: string;
}

interface MapSearchProps {
    onClose: () => void;
    activeRunners: Record<string, RunnerData>;
    onLocate: (lat: number, lng: number) => void;
}

export default function MapSearch({ onClose, activeRunners, onLocate }: MapSearchProps) {
    const [query, setQuery] = useState('');
    const [apiResults, setApiResults] = useState<UserResult[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const debounceTimer = useRef<NodeJS.Timeout | null>(null);

    // Merge API results with LIVE socket data in real-time
    const results = React.useMemo(() => {
        // Local filter for active runners matching query
        const activeMatches: UserResult[] = Object.values(activeRunners)
            .filter(r =>
                r.username.toLowerCase().includes(query.toLowerCase()) ||
                r.userColor.toLowerCase() === query.toLowerCase()
            )
            .map(r => ({
                id: r.userId,
                username: r.username,
                color: r.userColor,
                isRunningNow: true,
                lastPosition: { lat: r.lat, lng: r.lng },
                totalHexes: 0
            }));

        const mergedMap = new Map<string, UserResult>();
        apiResults.forEach(u => mergedMap.set(u.id, u));

        // Live data ALWAYS overwrites stale API data
        activeMatches.forEach(m => mergedMap.set(m.id, m));

        return Array.from(mergedMap.values());
    }, [apiResults, activeRunners, query]);

    const performSearch = useCallback(async (searchTerm: string) => {
        if (searchTerm.length < 2 && !searchTerm.startsWith('#')) {
            setApiResults([]);
            return;
        }

        setIsLoading(true);
        try {
            const { data } = await api.get(`/user/search?q=${encodeURIComponent(searchTerm)}`);
            setApiResults(data.users);
        } catch (err) {
            console.error('[Search] Failed:', err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (debounceTimer.current) clearTimeout(debounceTimer.current);
        debounceTimer.current = setTimeout(() => {
            performSearch(query);
        }, 300);

        return () => {
            if (debounceTimer.current) clearTimeout(debounceTimer.current);
        };
    }, [query, performSearch]);

    const handleSelect = (user: UserResult) => {
        // Prefer live position if available
        const active = activeRunners[user.id];
        const lat = active?.lat || user.lastPosition?.lat;
        const lng = active?.lng || user.lastPosition?.lng;

        if (lat && lng) {
            onLocate(lat, lng);
            onClose();
        } else {
            toast.error('No uplink coordinates for this user.');
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-4 left-4 right-4 z-[1001] bg-white/95 backdrop-blur-xl rounded-[24px] shadow-2xl border border-black/5 overflow-hidden max-w-lg mx-auto"
        >
            <div className="p-4 flex items-center gap-3 border-b border-black/5">
                <Search className="text-gray-400" size={20} />
                <input
                    autoFocus
                    type="text"
                    placeholder="Search by code, color (#00FF88)..."
                    className="flex-1 bg-transparent outline-none text-[#1a1a2e] font-bold text-base"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                />
                <button onClick={onClose} className="p-2 hover:bg-black/5 rounded-full transition-colors">
                    <X size={20} />
                </button>
            </div>

            <div className="max-h-[400px] overflow-y-auto p-2 custom-scrollbar">
                {isLoading && (
                    <div className="p-8 text-center">
                        <Zap className="animate-spin mx-auto text-[#A8D5BA] mb-2" size={24} />
                        <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Scanning Grid...</span>
                    </div>
                )}

                {!isLoading && results.length === 0 && query.length >= 2 && (
                    <div className="p-8 text-center text-gray-400 italic text-sm font-medium">
                        No runners found in this sector.
                    </div>
                )}

                <div className="flex flex-col gap-1">
                    {results.map((user) => (
                        <button
                            key={user.id}
                            onClick={() => handleSelect(user)}
                            className="flex items-center gap-3 p-3 hover:bg-black/5 rounded-xl transition-all text-left group"
                        >
                            <div
                                className="w-10 h-10 rounded-full border-2 border-white shadow-sm flex items-center justify-center shrink-0"
                                style={{ backgroundColor: user.color }}
                            >
                                <User size={18} className="text-white opacity-80" />
                            </div>

                            <div className="flex-1">
                                <div className="flex items-center gap-2">
                                    <span className="font-extrabold text-[#1a1a2e]">{user.username}</span>
                                    {user.isRunningNow && (
                                        <span className="bg-[#A8D5BA]/20 text-[#2E7D52] text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-tighter">
                                            Live
                                        </span>
                                    )}
                                </div>
                                <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                                    {user.city || 'Regional'} • {user.totalHexes} Hexes
                                </div>
                            </div>

                            {(user.lastPosition || activeRunners[user.id]) ? (
                                <MapPin size={16} className="text-gray-300 group-hover:text-[#A8D5BA] transition-colors" />
                            ) : (
                                <span className="text-[10px] text-gray-300 font-black uppercase tracking-tighter">Offline</span>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            <style jsx>{`
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.05); border-radius: 10px; }
            `}</style>
        </motion.div>
    );
}
