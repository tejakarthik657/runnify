import { useEffect, useState, useRef } from 'react';
import { useSocket } from './useSocket';
import useSWR from 'swr';
import api from '../services/api';

const fetcher = (url: string) => api.get(url).then(res => res.data);

/**
 * Hook that provides real-time leaderboard updates via Socket.IO
 * Combines initial SWR data with Socket.IO event listeners for instant updates
 */
export const useRealtimeLeaderboard = (scope: 'global' | 'city', city: string) => {
    const socket = useSocket('main');
    const [entries, setEntries] = useState<any[]>([]);
    const [meRank, setMeRank] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const entriesRef = useRef<Map<string, any>>(new Map());

    // Initial fetch
    const url = scope === 'global' ? '/leaderboard/global' : `/leaderboard/city/${city}`;
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
            setEntries(Array.from(entriesRef.current.values()).sort((a, b) => a.rank - b.rank));
        };

        const handleLeaderboardRefresh = (data: any) => {
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
