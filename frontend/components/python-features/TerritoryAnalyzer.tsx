'use client';

import { useEffect, useState } from 'react';
import { Map, Shield, AlertTriangle, TrendingUp } from 'lucide-react';
import { analyzeTerritoryService, getExpansionPath, type TerritoryAnalysis } from '@/services/pythonServices';

interface TerritoryAnalyzerProps {
  userId: string;
}

export default function TerritoryAnalyzer({ userId }: TerritoryAnalyzerProps) {
  const [analysis, setAnalysis] = useState<TerritoryAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;

    const fetchAnalysis = async () => {
      try {
        setLoading(true);
        const response = await analyzeTerritoryService(userId);
        const payload = response as any;
        setAnalysis(payload.data ?? payload);
        setError(null);
      } catch (err: any) {
        setError(err.message || 'Failed to load territory analysis');
        console.error('Territory analysis error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalysis();
  }, [userId]);

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
          <AlertTriangle size={20} />
          <span className="text-sm">{error}</span>
        </div>
      </div>
    );
  }

  if (!analysis) return null;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
      <div className="flex items-center gap-3 pb-3 border-b">
        <div className="p-2 bg-[#A8D5BA]/20 rounded-lg">
          <Map size={24} className="text-[#1a1a2e]" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-[#1a1a2e]">Territory Analysis</h3>
          <p className="text-xs text-gray-500">Expansion & vulnerability metrics</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Total Territories */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Shield size={16} className="text-blue-600" />
            <span className="text-xs font-medium text-blue-900">Total Owned</span>
          </div>
          <div className="text-2xl font-black text-blue-900">
            {analysis.total_territories || 0}
          </div>
        </div>

        {/* Vulnerability Score */}
        <div className="bg-gradient-to-br from-orange-50 to-orange-100/50 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={16} className="text-orange-600" />
            <span className="text-xs font-medium text-orange-900">Vulnerability</span>
          </div>
          <div className="text-2xl font-black text-orange-900">
            {analysis.vulnerability_score?.toFixed(1) || '0.0'}%
          </div>
        </div>

        {/* Expansion Rate */}
        <div className="bg-gradient-to-br from-green-50 to-green-100/50 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={16} className="text-green-600" />
            <span className="text-xs font-medium text-green-900">Expansion Rate</span>
          </div>
          <div className="text-2xl font-black text-green-900">
            {analysis.expansion_rate?.toFixed(1) || '0.0'}%
          </div>
        </div>

        {/* At Risk Territories */}
        <div className="bg-gradient-to-br from-red-50 to-red-100/50 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={16} className="text-red-600" />
            <span className="text-xs font-medium text-red-900">At Risk</span>
          </div>
          <div className="text-2xl font-black text-red-900">
            {analysis.vulnerable_territories || 0}
          </div>
        </div>
      </div>

      {/* Recommended Actions */}
      {analysis.recommendations && analysis.recommendations.length > 0 && (
        <div className="pt-3 border-t">
          <h4 className="text-xs font-bold text-gray-700 uppercase mb-2">Recommendations</h4>
          <ul className="space-y-1">
            {analysis.recommendations.map((rec: string, idx: number) => (
              <li key={idx} className="text-xs text-gray-600 flex items-start gap-2">
                <span className="text-[#A8D5BA] font-bold">→</span>
                <span>{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
