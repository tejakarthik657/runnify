import { useEffect, useState, useRef } from 'react';
import { useSocket } from './useSocket';
import useSWR from 'swr';
import api from '../services/api';

const fetcher = (url: string) => api.get(url).then(res => res.data);

/**
 * Hook that provides real-time leaderboard updates via Socket.IO
 * Combines initial SWR data with Socket.IO event listeners for instant updates
 */
export const useRealtimeLeaderboard = (scope: 'global' | 'city', city: string, period: 'alltime' | '24hour' = 'alltime') => {
    const socket = useSocket('main');
    const [entries, setEntries] = useState<any[]>([]);
    const [meRank, setMeRank] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const entriesRef = useRef<Map<string, any>>(new Map());

    // Initial fetch with period support
    const getUrl = () => {
        if (period === '24hour') {
            return scope === 'global' ? '/leaderboard/24hour' : `/leaderboard/24hour/city/${city}`;
        }
        return scope === 'global' ? '/leaderboard/global' : `/leaderboard/city/${city}`;
    };

    const url = getUrl();
    const { data, isLoading: swrLoading } = useSWR(url, fetcher);
    const { data: meData } = useSWR('/leaderboard/me', fetcher);

    // Initialize with SWR data
    useEffect(() => {
        if (data?.entries) {
            setEntries(data.entries);
            data.entries.forEach((entry: any) => {
                entriesRef.current.set(entry.userId, entry);
            });
            setIsLoading(false);
        }
    }, [data]);

    useEffect(() => {
        if (meData) {
            setMeRank(meData);
        }
    }, [meData]);

    // Listen to real-time leaderboard events
    useEffect(() => {
        if (!socket) return;

        const handleLeaderboardUpdate = (data: { userId: string; updates: any }) => {
            entriesRef.current.set(data.userId, { ...entriesRef.current.get(data.userId), ...data.updates });
            setEntries(Array.from(entriesRef.current.values()).sort((a, b) => (a.rank || 999999) - (b.rank || 999999)));
        };

        const handleLeaderboardRefresh = (data: any) => {
            if (!data?.scope || !Array.isArray(data.entries)) return;
            if (data.scope !== scope) return;
            if (scope === 'city' && data.city !== city) return;

            entriesRef.current.clear();
            setEntries(data.entries || []);
            data.entries?.forEach((entry: any) => {
                entriesRef.current.set(entry.userId, entry);
            });
        };

        const handleRankUpdate = (data: any) => {
            setMeRank(data);
        };

        socket.on('leaderboard_update', handleLeaderboardUpdate);
        socket.on('leaderboard_refresh', handleLeaderboardRefresh);
        socket.on('rank_update', handleRankUpdate);

        return () => {
            socket.off('leaderboard_update', handleLeaderboardUpdate);
            socket.off('leaderboard_refresh', handleLeaderboardRefresh);
            socket.off('rank_update', handleRankUpdate);
        };
    }, [socket]);

    return {
        entries,
        meRank,
        isLoading: swrLoading || isLoading
    };
};
