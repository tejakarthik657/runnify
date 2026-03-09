'use client';

import { useEffect, useState } from 'react';
import { MapPin, Activity, Users, Flame } from 'lucide-react';
import { getUserActivityHeatmap, type HeatmapData } from '@/services/pythonServices';

interface HeatmapGeneratorProps {
  userId: string;
  days?: number;
}

export default function HeatmapGenerator({ userId, days = 30 }: HeatmapGeneratorProps) {
  const [heatmap, setHeatmap] = useState<HeatmapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;

    const fetchHeatmap = async () => {
      try {
        setLoading(true);
        const response = await getUserActivityHeatmap(userId, days);
        const payload = response as any;
        setHeatmap(payload.data ?? payload);
        setError(null);
      } catch (err: any) {
        setError(err.message || 'Failed to load activity heatmap');
        console.error('Heatmap error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchHeatmap();
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
          <MapPin size={20} />
          <span className="text-sm">{error}</span>
        </div>
      </div>
    );
  }

  if (!heatmap) return null;

  const getIntensityColor = (intensity: number) => {
    if (intensity >= 80) return 'bg-red-500';
    if (intensity >= 60) return 'bg-orange-500';
    if (intensity >= 40) return 'bg-yellow-500';
    if (intensity >= 20) return 'bg-green-500';
    return 'bg-blue-500';
  };

  const getIntensityLabel = (intensity: number) => {
    if (intensity >= 80) return 'Very High';
    if (intensity >= 60) return 'High';
    if (intensity >= 40) return 'Moderate';
    if (intensity >= 20) return 'Low';
    return 'Very Low';
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
      <div className="flex items-center gap-3 pb-3 border-b">
        <div className="p-2 bg-[#A8D5BA]/20 rounded-lg">
          <Flame size={24} className="text-orange-600" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-[#1a1a2e]">Activity Heatmap</h3>
          <p className="text-xs text-gray-500">Last {days} days</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {/* Total Points */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <MapPin size={16} className="text-blue-600" />
            <span className="text-xs font-medium text-blue-900">Data Points</span>
          </div>
          <div className="text-2xl font-black text-blue-900">
            {heatmap.total_points || 0}
          </div>
        </div>

        {/* Unique Locations */}
        <div className="bg-gradient-to-br from-green-50 to-green-100/50 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Activity size={16} className="text-green-600" />
            <span className="text-xs font-medium text-green-900">Locations</span>
          </div>
          <div className="text-2xl font-black text-green-900">
            {heatmap.unique_locations || 0}
          </div>
        </div>

        {/* Max Intensity */}
        <div className="bg-gradient-to-br from-red-50 to-red-100/50 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Flame size={16} className="text-red-600" />
            <span className="text-xs font-medium text-red-900">Peak</span>
          </div>
          <div className="text-2xl font-black text-red-900">
            {(heatmap.max_intensity || 0).toFixed(0)}
          </div>
        </div>
      </div>

      {/* Heatmap Points Preview */}
      {heatmap.points && heatmap.points.length > 0 && (
        <div className="pt-3 border-t">
          <h4 className="text-xs font-bold text-gray-700 uppercase mb-3">Hot Spots</h4>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {heatmap.points
              .sort((a, b) => (b.intensity || 0) - (a.intensity || 0))
              .slice(0, 5)
              .map((point, idx) => (
                <div 
                  key={idx}
                  className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${getIntensityColor(point.intensity || 0)}`}></div>
                    <div>
                      <div className="text-xs font-medium text-gray-900">
                        {point.lat?.toFixed(4)}, {point.lng?.toFixed(4)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {getIntensityLabel(point.intensity || 0)}
                      </div>
                    </div>
                  </div>
                  <div className="text-sm font-bold text-gray-900">
                    {(point.intensity || 0).toFixed(0)}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Intensity Legend */}
      <div className="bg-gray-50 rounded-lg p-3 mt-3">
        <div className="text-xs font-bold text-gray-700 uppercase mb-2">Intensity Scale</div>
        <div className="flex items-center gap-1">
          <div className="flex-1 h-2 bg-gradient-to-r from-blue-500 via-yellow-500 to-red-500 rounded-full"></div>
        </div>
        <div className="flex justify-between text-xs text-gray-600 mt-1">
          <span>Low</span>
          <span>High</span>
        </div>
      </div>
    </div>
  );
}
