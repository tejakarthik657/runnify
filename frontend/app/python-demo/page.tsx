'use client';

import { useEffect, useState } from 'react';
import { Activity, TrendingUp, Award, Flame, Map, Mountain, MapPin } from 'lucide-react';
import RunStatsCard from '@/components/python-features/RunStatsCard';
import EngagementScoreWidget from '@/components/python-features/EngagementScoreWidget';
import StreakDisplay from '@/components/python-features/StreakDisplay';
import TerritoryAnalyzer from '@/components/python-features/TerritoryAnalyzer';
import ElevationAnalyzer from '@/components/python-features/ElevationAnalyzer';
import HeatmapGenerator from '@/components/python-features/HeatmapGenerator';

export default function AnalyticsLabPage() {
  const [userId, setUserId] = useState<string>('');

  // In real app, get from auth context
  useEffect(() => {
    // Mock user ID for demo
    const mockUserId = localStorage.getItem('userId') || 'demo-user-123';
    setUserId(mockUserId);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#A8D5BA]/20 to-white p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl md:text-5xl font-black text-[#1a1a2e]">
            Analytics Lab
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Advanced run intelligence, engagement tracking, and territory insights for your daily training.
            <strong>Built for live users.</strong>
          </p>
          
          {/* Service Status */}
          <div className="flex flex-wrap justify-center gap-2 pt-4">
            <ServiceStatusBadge name="Run Insights" />
            <ServiceStatusBadge name="Territory IQ" />
            <ServiceStatusBadge name="Engagement" />
            <ServiceStatusBadge name="Milestones" />
            <ServiceStatusBadge name="Streaks" />
            <ServiceStatusBadge name="Route Value" />
          </div>
        </div>

        {/* Features Grid - Row 1: Analytics Core Services */}
        {userId && (
          <>
            <div className="text-center mb-4">
              <h2 className="text-2xl font-black text-[#1a1a2e] uppercase">Analytics Core Services</h2>
              <p className="text-sm text-gray-600">Your live performance, consistency, and territory intelligence</p>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Column 1: Run Statistics */}
              <div className="space-y-6">
                <div className="flex items-center gap-2">
                  <TrendingUp size={24} className="text-[#1a1a2e]" />
                  <h2 className="text-xl font-black uppercase">Analytics</h2>
                </div>
                <RunStatsCard userId={userId} timePeriod="30" />
              </div>

              {/* Column 2: Engagement */}
              <div className="space-y-6">
                <div className="flex items-center gap-2">
                  <Activity size={24} className="text-[#1a1a2e]" />
                  <h2 className="text-xl font-black uppercase">Engagement</h2>
                </div>
                <EngagementScoreWidget userId={userId} />
              </div>

              {/* Column 3: Streak */}
              <div className="space-y-6">
                <div className="flex items-center gap-2">
                  <Flame size={24} className="text-orange-600" />
                  <h2 className="text-xl font-black uppercase">Streak</h2>
                </div>
                <StreakDisplay userId={userId} />
              </div>
            </div>

            {/* Features Grid - Row 2: NEW Node.js Analytics */}
            <div className="text-center mt-12 mb-4">
              <h2 className="text-2xl font-black text-[#1a1a2e] uppercase">✨ NEW: Node.js Analytics</h2>
              <p className="text-sm text-gray-600">Territory, Elevation & Heatmap directly in backend (no Python instances!)</p>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Column 1: Territory Analysis */}
              <div className="space-y-6">
                <div className="flex items-center gap-2">
                  <Map size={24} className="text-[#1a1a2e]" />
                  <h2 className="text-xl font-black uppercase">Territory</h2>
                </div>
                <TerritoryAnalyzer userId={userId} />
              </div>

              {/* Column 2: Elevation */}
              <div className="space-y-6">
                <div className="flex items-center gap-2">
                  <Mountain size={24} className="text-[#1a1a2e]" />
                  <h2 className="text-xl font-black uppercase">Elevation</h2>
                </div>
                <ElevationAnalyzer userId={userId} days={30} />
              </div>

              {/* Column 3: Heatmap */}
              <div className="space-y-6">
                <div className="flex items-center gap-2">
                  <MapPin size={24} className="text-orange-600" />
                  <h2 className="text-xl font-black uppercase">Heatmap</h2>
                </div>
                <HeatmapGenerator userId={userId} days={30} />
              </div>
            </div>
          </>
        )}

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-8">
          <InfoCard 
            icon="🚀"
            title="Live Analytics"
            description="Insights update from your runs and activity"
          />
          <InfoCard 
            icon="💰"
            title="Smarter Credits"
            description="See where your routes earn more"
          />
          <InfoCard 
            icon="⚡"
            title="Fast Feedback"
            description="Pace, effort, and progress at a glance"
          />
          <InfoCard 
            icon="🎯"
            title="Goal Tracking"
            description="Milestones, streaks, and consistency trends"
          />
        </div>

        {/* What You Get */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-black uppercase mb-4">What You Get</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ServiceCard 
              name="Run Intelligence"
              description="Track pace trends, best efforts, and weekly progress"
            />
            <ServiceCard 
              name="Territory Strategy"
              description="See hotspots, expansion opportunities, and weak zones"
            />
            <ServiceCard 
              name="Engagement Score"
              description="Understand consistency, momentum, and drop-off risk"
            />
            <ServiceCard 
              name="Achievement System"
              description="Earn badges and milestone unlocks as you improve"
            />
            <ServiceCard 
              name="Motivation Layer"
              description="Smart run names and streak nudges to keep you moving"
            />
            <ServiceCard 
              name="Credit Optimization"
              description="Find better route choices to maximize rewards"
            />
          </div>
        </div>

        {/* Tips */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
          <h3 className="text-lg font-black uppercase mb-4 text-blue-900">How To Use Analytics Lab</h3>
          <ol className="space-y-2 text-sm text-blue-900">
            <li><strong>1.</strong> Start a run and complete at least one session.</li>
            <li><strong>2.</strong> Revisit this page to view updated pace, streak, and engagement metrics.</li>
            <li><strong>3.</strong> Use territory and heatmap cards to pick your next high-impact route.</li>
            <li><strong>4.</strong> Check progress weekly to improve consistency and unlock milestones.</li>
          </ol>
        </div>
      </div>
    </div>
  );
}

// Helper components
function ServiceStatusBadge({ name }: { name: string }) {
  return (
    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border bg-emerald-50 border-emerald-500 text-emerald-700">
      <span className="w-2 h-2 rounded-full bg-emerald-500" />
      {name}
    </div>
  );
}

function InfoCard({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
      <div className="text-3xl mb-2">{icon}</div>
      <div className="text-lg font-black">{title}</div>
      <div className="text-xs text-gray-500">{description}</div>
    </div>
  );
}

function ServiceCard({ name, description }: { name: string; description: string }) {
  return (
    <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
      <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-[#A8D5BA] flex items-center justify-center text-white font-black text-sm">
        ⬡
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-black text-sm text-[#1a1a2e]">{name}</div>
        <div className="text-xs text-gray-600 mt-1">{description}</div>
      </div>
    </div>
  );
}
