'use client';

import { useEffect, useState } from 'react';
import { Activity, Gauge } from 'lucide-react';
import { getEngagementScore, type EngagementScore } from '@/services/pythonServices';

interface EngagementScoreWidgetProps {
  userId: string;
}

export default function EngagementScoreWidget({ userId }: EngagementScoreWidgetProps) {
  const [engagement, setEngagement] = useState<EngagementScore | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEngagement = async () => {
      try {
        setLoading(true);
        const response = await getEngagementScore(userId);
        setEngagement(response.data);
      } catch (err) {
        console.error('Engagement score error:', err);
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchEngagement();
    }
  }, [userId]);

  if (loading) {
    return (
      <div className="rounded-xl border border-[#A8D5BA]/30 bg-white/50 backdrop-blur p-4">
        <div className="animate-pulse">
          <div className="w-24 h-24 bg-gray-200 rounded-full mx-auto mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto"></div>
        </div>
      </div>
    );
  }

  if (!engagement) return null;

  // Determine color based on score
  const getColorByScore = (score: number) => {
    if (score >= 80) return { bg: 'bg-emerald-500', text: 'text-emerald-600', border: 'border-emerald-500' };
    if (score >= 60) return { bg: 'bg-blue-500', text: 'text-blue-600', border: 'border-blue-500' };
    if (score >= 40) return { bg: 'bg-yellow-500', text: 'text-yellow-600', border: 'border-yellow-500' };
    if (score >= 20) return { bg: 'bg-orange-500', text: 'text-orange-600', border: 'border-orange-500' };
    return { bg: 'bg-red-500', text: 'text-red-600', border: 'border-red-500' };
  };

  const colors = getColorByScore(engagement.score);
  const circumference = 2 * Math.PI * 45; // radius = 45
  const strokeDashoffset = circumference - (engagement.score / 100) * circumference;

  return (
    <div className="rounded-xl border border-[#A8D5BA]/50 bg-gradient-to-br from-white/90 to-[#A8D5BA]/10 backdrop-blur p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Gauge size={20} className="text-[#1a1a2e]" />
        <h3 className="text-sm font-black uppercase text-[#1a1a2e]">Engagement</h3>
      </div>

      {/* Circular Progress */}
      <div className="relative w-32 h-32 mx-auto">
        <svg className="transform -rotate-90 w-32 h-32">
          {/* Background circle */}
          <circle
            cx="64"
            cy="64"
            r="45"
            stroke="currentColor"
            strokeWidth="8"
            fill="none"
            className="text-gray-200"
          />
          {/* Progress circle */}
          <circle
            cx="64"
            cy="64"
            r="45"
            stroke="currentColor"
            strokeWidth="8"
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className={colors.text}
            strokeLinecap="round"
          />
        </svg>
        {/* Score in center */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-3xl font-black text-[#1a1a2e]">{engagement.score}</div>
          <div className="text-xs font-bold text-gray-500">/ 100</div>
        </div>
      </div>

      {/* Level Badge */}
      <div className="flex justify-center">
        <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border-2 ${colors.border} bg-white/80`}>
          <Activity size={14} className={colors.text} />
          <span className={`text-sm font-black uppercase ${colors.text}`}>{engagement.level}</span>
        </div>
      </div>

      {/* Component Breakdown */}
      <div className="space-y-2 pt-4 border-t border-gray-200">
        <div className="text-xs font-bold uppercase text-gray-500 mb-3">Score Breakdown</div>
        
        {/* Frequency */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-gray-600">Frequency</span>
            <span className="font-bold">{engagement.components.frequency}/30</span>
          </div>
          <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-emerald-500 rounded-full transition-all" 
              style={{ width: `${(engagement.components.frequency / 30) * 100}%` }}
            />
          </div>
        </div>

        {/* Distance */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-gray-600">Distance</span>
            <span className="font-bold">{engagement.components.distance}/25</span>
          </div>
          <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-blue-500 rounded-full transition-all" 
              style={{ width: `${(engagement.components.distance / 25) * 100}%` }}
            />
          </div>
        </div>

        {/* Recency */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-gray-600">Recency</span>
            <span className="font-bold">{engagement.components.recency}/25</span>
          </div>
          <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-purple-500 rounded-full transition-all" 
              style={{ width: `${(engagement.components.recency / 25) * 100}%` }}
            />
          </div>
        </div>

        {/* Consistency */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-gray-600">Consistency</span>
            <span className="font-bold">{engagement.components.consistency}/20</span>
          </div>
          <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-orange-500 rounded-full transition-all" 
              style={{ width: `${(engagement.components.consistency / 20) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Last Run Info */}
      <div className="text-xs text-center text-gray-500 pt-2">
        {engagement.days_since_last_run === 0 ? (
          <span className="text-emerald-600 font-bold">✓ Ran today!</span>
        ) : (
          <span>Last run: {engagement.days_since_last_run} day{engagement.days_since_last_run !== 1 ? 's' : ''} ago</span>
        )}
      </div>
    </div>
  );
}
