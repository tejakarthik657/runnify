'use client';

import { useEffect, useState } from 'react';
import { Trophy, TrendingUp, Calendar, Zap } from 'lucide-react';
import { getRunStatistics, type RunStatistics } from '@/services/pythonServices';

interface RunStatsCardProps {
  userId: string;
  timePeriod?: string;
}

export default function RunStatsCard({ userId, timePeriod = '30' }: RunStatsCardProps) {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const response = await getRunStatistics(userId, timePeriod);
        setStats(response.data);
        setError(null);
      } catch (err: any) {
        setError(err.message || 'Failed to load statistics');
        console.error('Stats error:', err);
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchStats();
    }
  }, [userId, timePeriod]);

  if (loading) {
    return (
      <div className="rounded-xl border border-[#A8D5BA]/30 bg-white/50 backdrop-blur p-6">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-gray-200 rounded w-1/3"></div>
          <div className="h-8 bg-gray-200 rounded w-2/3"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-300 bg-red-50 p-6">
        <p className="text-sm text-red-600">⚠️ {error}</p>
        <p className="text-xs text-gray-500 mt-2">Make sure Python services are running</p>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="rounded-xl border border-[#A8D5BA]/50 bg-gradient-to-br from-white/90 to-[#A8D5BA]/10 backdrop-blur p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-black uppercase text-[#1a1a2e]">Your Stats</h3>
        <div className="text-xs font-bold text-gray-500">{timePeriod} Days</div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        {/* Total Runs */}
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-[#A8D5BA]/20 flex items-center justify-center">
            <Trophy size={20} className="text-[#1a1a2e]" />
          </div>
          <div>
            <div className="text-2xl font-black text-[#1a1a2e]">{stats.total_runs}</div>
            <div className="text-xs font-bold uppercase text-gray-500">Total Runs</div>
          </div>
        </div>

        {/* Total Distance */}
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
            <TrendingUp size={20} className="text-blue-600" />
          </div>
          <div>
            <div className="text-2xl font-black text-[#1a1a2e]">{stats.total_distance_km.toFixed(1)} km</div>
            <div className="text-xs font-bold uppercase text-gray-500">Distance</div>
          </div>
        </div>

        {/* Avg Pace */}
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
            <Zap size={20} className="text-purple-600" />
          </div>
          <div>
            <div className="text-2xl font-black text-[#1a1a2e]">{stats.avg_pace}</div>
            <div className="text-xs font-bold uppercase text-gray-500">Avg Pace /km</div>
          </div>
        </div>

        {/* Runs per Week */}
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
            <Calendar size={20} className="text-orange-600" />
          </div>
          <div>
            <div className="text-2xl font-black text-[#1a1a2e]">{stats.runs_per_week}</div>
            <div className="text-xs font-bold uppercase text-gray-500">Runs/Week</div>
          </div>
        </div>
      </div>

      {/* Additional Info */}
      <div className="pt-4 border-t border-gray-200">
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Avg Distance:</span>
            <span className="font-bold">{stats.avg_distance_km.toFixed(1)} km</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Calories:</span>
            <span className="font-bold">{stats.total_calories.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Best Distance:</span>
            <span className="font-bold">{stats.best_distance.toFixed(1)} km</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Avg Speed:</span>
            <span className="font-bold">{stats.avg_speed_kmh.toFixed(1)} km/h</span>
          </div>
        </div>
      </div>
    </div>
  );
}
