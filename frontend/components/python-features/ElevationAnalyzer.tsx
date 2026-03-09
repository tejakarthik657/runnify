'use client';

import { useEffect, useState } from 'react';
import { Mountain, TrendingUp, TrendingDown, Award } from 'lucide-react';
import { getElevationUserStats, type ElevationStats } from '@/services/pythonServices';

interface ElevationAnalyzerProps {
  userId: string;
  days?: number;
}

export default function ElevationAnalyzer({ userId, days = 30 }: ElevationAnalyzerProps) {
  const [stats, setStats] = useState<ElevationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;

    const fetchStats = async () => {
      try {
        setLoading(true);
        const response = await getElevationUserStats(userId, days);
        const payload = response as any;
        setStats(payload.data ?? payload);
        setError(null);
      } catch (err: any) {
        setError(err.message || 'Failed to load elevation stats');
        console.error('Elevation stats error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [userId, days]);

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#A8D5BA]"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl border border-red-200 p-6">
        <div className="flex items-center gap-2 text-red-600">
          <Mountain size={20} />
          <span className="text-sm">{error}</span>
        </div>
      </div>
    );
  }

  if (!stats) return null;

  const terrainColor = {
    flat: 'text-gray-600',
    rolling: 'text-blue-600',
    hilly: 'text-green-600',
    mountainous: 'text-orange-600',
    extreme: 'text-red-600'
  }[stats.terrain_classification || 'flat'] || 'text-gray-600';

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
      <div className="flex items-center gap-3 pb-3 border-b">
        <div className="p-2 bg-[#A8D5BA]/20 rounded-lg">
          <Mountain size={24} className="text-[#1a1a2e]" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-[#1a1a2e]">Elevation Stats</h3>
          <p className="text-xs text-gray-500">Last {days} days</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Total Elevation Gain */}
        <div className="bg-gradient-to-br from-green-50 to-green-100/50 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={16} className="text-green-600" />
            <span className="text-xs font-medium text-green-900">Elevation Gain</span>
          </div>
          <div className="text-2xl font-black text-green-900">
            {(stats.total_elevation_gain || 0).toFixed(0)}m
          </div>
        </div>

        {/* Total Elevation Loss */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown size={16} className="text-blue-600" />
            <span className="text-xs font-medium text-blue-900">Elevation Loss</span>
          </div>
          <div className="text-2xl font-black text-blue-900">
            {(stats.total_elevation_loss || 0).toFixed(0)}m
          </div>
        </div>

        {/* Average Grade */}
        <div className="bg-gradient-to-br from-purple-50 to-purple-100/50 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Mountain size={16} className="text-purple-600" />
            <span className="text-xs font-medium text-purple-900">Avg Grade</span>
          </div>
          <div className="text-2xl font-black text-purple-900">
            {(stats.average_grade || 0).toFixed(1)}%
          </div>
        </div>

        {/* Runs Analyzed */}
        <div className="bg-gradient-to-br from-gray-50 to-gray-100/50 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Award size={16} className="text-gray-600" />
            <span className="text-xs font-medium text-gray-900">Runs</span>
          </div>
          <div className="text-2xl font-black text-gray-900">
            {stats.runs_analyzed || 0}
          </div>
        </div>
      </div>

      {/* Terrain Classification */}
      <div className="bg-gradient-to-br from-amber-50 to-amber-100/50 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-amber-900 mb-1">Terrain Type</div>
            <div className={`text-xl font-black capitalize ${terrainColor}`}>
              {stats.terrain_classification || 'Unknown'}
            </div>
          </div>
          <Mountain size={32} className={terrainColor} />
        </div>
      </div>

      {/* Badges Earned */}
      {stats.badges_earned && stats.badges_earned.length > 0 && (
        <div className="pt-3 border-t">
          <h4 className="text-xs font-bold text-gray-700 uppercase mb-2">Badges Earned</h4>
          <div className="flex flex-wrap gap-2">
            {stats.badges_earned.map((badge: string, idx: number) => (
              <span 
                key={idx}
                className="px-3 py-1 bg-gradient-to-r from-yellow-400 to-amber-500 text-white text-xs font-bold rounded-full"
              >
                🏆 {badge}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
