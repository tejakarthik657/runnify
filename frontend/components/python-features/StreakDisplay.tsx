'use client';

import { useEffect, useState } from 'react';
import { Flame, Calendar, Trophy, TrendingUp } from 'lucide-react';
import { calculateStreak, predictNextMilestone, type StreakData } from '@/services/pythonServices';

interface StreakDisplayProps {
  userId: string;
}

export default function StreakDisplay({ userId }: StreakDisplayProps) {
  const [streak, setStreak] = useState<StreakData | null>(null);
  const [milestone, setMilestone] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStreak = async () => {
      try {
        setLoading(true);
        const streakResponse = await calculateStreak(userId);
        const streakData = streakResponse.data;
        setStreak(streakData);

        // Fetch milestone if streak is active
        if (streakData.current_streak > 0) {
          const milestoneResponse = await predictNextMilestone(streakData.current_streak);
          setMilestone(milestoneResponse.data);
        }
      } catch (err) {
        console.error('Streak error:', err);
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchStreak();
    }
  }, [userId]);

  if (loading) {
    return (
      <div className="rounded-xl border border-[#A8D5BA]/30 bg-white/50 backdrop-blur p-4">
        <div className="animate-pulse space-y-3">
          <div className="h-16 bg-gray-200 rounded" />
          <div className="h-4 bg-gray-200 rounded w-2/3" />
        </div>
      </div>
    );
  }

  if (!streak) return null;

  const isActive = streak.status === 'Active';
  const streakColor = isActive ? 'text-orange-600' : 'text-gray-400';
  const streakBg = isActive ? 'bg-orange-500' : 'bg-gray-400';

  return (
    <div className={`rounded-xl border ${isActive ? 'border-orange-500/50 bg-gradient-to-br from-orange-50 to-white' : 'border-gray-300 bg-gray-50'} p-6 space-y-4`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Flame size={24} className={streakColor} />
          <h3 className="text-sm font-black uppercase text-[#1a1a2e]">Running Streak</h3>
        </div>
        {isActive && (
          <div className="px-3 py-1 rounded-full bg-emerald-100 border border-emerald-500">
            <span className="text-xs font-black uppercase text-emerald-700">Active</span>
          </div>
        )}
      </div>

      {/* Streak Count */}
      <div className="text-center py-4">
        <div className={`text-6xl font-black ${streakColor} mb-2`}>
          {streak.current_streak}
        </div>
        <div className="text-sm font-bold uppercase text-gray-600">
          {streak.current_streak === 1 ? 'Day' : 'Days'} Streak
        </div>
      </div>

      {/* Status Message */}
      {streak.status === 'Streak broken' ? (
        <div className="text-center p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm font-bold text-yellow-800">Time to start a new streak!</p>
          <p className="text-xs text-yellow-600 mt-1">
            Last run: {streak.days_since_last_run} day{streak.days_since_last_run !== 1 ? 's' : ''} ago
          </p>
        </div>
      ) : (
        <>
          {/* Milestone Progress */}
          {milestone && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Next Milestone</span>
                <span className="font-black text-[#1a1a2e]">{milestone.milestone_name}</span>
              </div>

              {/* Progress Bar */}
              <div className="relative w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full ${streakBg} rounded-full transition-all`}
                  style={{ width: `${(streak.current_streak / milestone.next_milestone) * 100}%` }}
                />
              </div>

              {/* Details */}
              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="p-3 bg-white/80 rounded-lg border border-gray-200">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Calendar size={14} className="text-gray-500" />
                    <span className="text-xs font-bold text-gray-500">Days Left</span>
                  </div>
                  <div className="text-xl font-black text-[#1a1a2e]">{milestone.days_until_milestone}</div>
                </div>

                <div className="p-3 bg-white/80 rounded-lg border border-gray-200">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Trophy size={14} className="text-yellow-600" />
                    <span className="text-xs font-bold text-gray-500">Reward</span>
                  </div>
                  <div className="text-xl font-black text-[#1a1a2e]">{milestone.reward_credits}</div>
                </div>
              </div>

              {/* Estimated Date */}
              <div className="text-center text-xs text-gray-500">
                Est. completion: {new Date(milestone.estimated_date).toLocaleDateString()}
              </div>
            </div>
          )}

          {/* Info Grid */}
          <div className="grid grid-cols-2 gap-2 pt-4 border-t border-gray-200">
            <div className="text-xs">
              <span className="text-gray-500">Started:</span>
              <span className="font-bold ml-1">
                {streak.streak_start_date ? new Date(streak.streak_start_date).toLocaleDateString() : 'N/A'}
              </span>
            </div>
            <div className="text-xs">
              <span className="text-gray-500">Total Days Active:</span>
              <span className="font-bold ml-1">{streak.days_active}</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
