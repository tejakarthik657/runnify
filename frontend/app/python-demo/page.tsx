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
  const [showFeatures, setShowFeatures] = useState(false);

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
            Advanced run intelligence, engagement tracking, and territory insights powered by
            production microservices. <strong>Built for live users.</strong>
          </p>
          
          {/* Service Status */}
          <div className="flex flex-wrap justify-center gap-2 pt-4">
            <ServiceStatusBadge port={8001} name="Stats" />
            <ServiceStatusBadge port={8002} name="Hex" />
            <ServiceStatusBadge port={8003} name="Engagement" />
            <ServiceStatusBadge port={8011} name="Badges" />
            <ServiceStatusBadge port={8017} name="Names" />
            <ServiceStatusBadge port={8018} name="Streak" />
            <ServiceStatusBadge port={8019} name="Credits" />
          </div>
        </div>

        {/* Features Grid - Row 1: Analytics Core Services */}
        {userId && (
          <>
            <div className="text-center mb-4">
              <h2 className="text-2xl font-black text-[#1a1a2e] uppercase">Analytics Core Services</h2>
              <p className="text-sm text-gray-600">Original services (ports 8001-8019)</p>
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
            title="7 Services Live"
            description="Production-ready analytics services"
          />
          <InfoCard 
            icon="💰"
            title="100% Free"
            description="No paid APIs or GPU needed"
          />
          <InfoCard 
            icon="⚡"
            title="300MB Total"
            description="Lightweight & efficient"
          />
          <InfoCard 
            icon="🔌"
            title="REST APIs"
            description="FastAPI with Redis caching"
          />
        </div>

        {/* Integration Code */}
        <div className="bg-[#1a1a2e] rounded-xl p-6 text-white">
          <h3 className="text-lg font-black uppercase mb-4 text-[#A8D5BA]">Quick Integration</h3>
          <pre className="text-sm overflow-x-auto">
            <code>{`import { getRunStatistics, getEngagementScore } from '@/services/pythonServices';

// Get run statistics
const stats = await getRunStatistics('user123', '30');
console.log(stats.data.total_runs);

// Get engagement score  
const engagement = await getEngagementScore('user123');
console.log(engagement.data.score); // 0-100

// Frontend components
<RunStatsCard userId="user123" />
<EngagementScoreWidget userId="user123" />
<StreakDisplay userId="user123" />`}</code>
          </pre>
        </div>

        {/* Available Services */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-black uppercase mb-4">Available Analytics Services</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ServiceCard 
              name="Run Statistics"
              port={8001}
              description="Calculate pace, PRs, weekly summaries, calories"
            />
            <ServiceCard 
              name="Hex Territory Analyzer"
              port={8002}
              description="Territory clusters, expansion suggestions"
            />
            <ServiceCard 
              name="Engagement Engine"
              port={8003}
              description="0-100 score, churn prediction, patterns"
            />
            <ServiceCard 
              name="Badge Generator"
              port={8011}
              description="Achievement badges, QR codes (PIL)"
            />
            <ServiceCard 
              name="Run Name Generator"
              port={8017}
              description="Creative names for runs (epic, funny, motivational)"
            />
            <ServiceCard 
              name="Streak Calculator"
              port={8018}
              description="Track streaks, predict milestones"
            />
            <ServiceCard 
              name="Credit Optimizer"
              port={8019}
              description="Optimize routes for max credits"
            />
          </div>
        </div>

        {/* Setup Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
          <h3 className="text-lg font-black uppercase mb-4 text-blue-900">🚀 Setup Instructions</h3>
          <ol className="space-y-2 text-sm text-blue-900">
            <li><strong>1.</strong> Install dependencies: <code className="bg-blue-100 px-2 py-1 rounded">pip install -r backend/python-services/requirements.txt</code></li>
            <li><strong>2.</strong> Set environment variables: <code className="bg-blue-100 px-2 py-1 rounded">DATABASE_URL</code> and <code className="bg-blue-100 px-2 py-1 rounded">REDIS_URL</code></li>
            <li><strong>3.</strong> Start services: <code className="bg-blue-100 px-2 py-1 rounded">python backend/python-services/start_services.py</code></li>
            <li><strong>4.</strong> Access via API gateway: <code className="bg-blue-100 px-2 py-1 rounded">http://localhost:4000/python/stats/...</code></li>
          </ol>
        </div>
      </div>
    </div>
  );
}

// Helper components
function ServiceStatusBadge({ port, name }: { port: number; name: string }) {
  const [status, setStatus] = useState<'checking' | 'online' | 'offline'>('checking');

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const response = await fetch(`http://localhost:${port}/health`);
        setStatus(response.ok ? 'online' : 'offline');
      } catch {
        setStatus('offline');
      }
    };
    checkHealth();
  }, [port]);

  return (
    <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
      status === 'online' ? 'bg-emerald-50 border-emerald-500 text-emerald-700' :
      status === 'offline' ? 'bg-red-50 border-red-300 text-red-600' :
      'bg-gray-50 border-gray-300 text-gray-500'
    }`}>
      <span className={`w-2 h-2 rounded-full ${
        status === 'online' ? 'bg-emerald-500' :
        status === 'offline' ? 'bg-red-500' :
        'bg-gray-400'
      }`} />
      {name} :{port}
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

function ServiceCard({ name, port, description }: { name: string; port: number; description: string }) {
  return (
    <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
      <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-[#A8D5BA] flex items-center justify-center text-white font-black text-sm">
        {port.toString().slice(-2)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-black text-sm text-[#1a1a2e]">{name}</div>
        <div className="text-xs text-gray-500 font-medium">:{port}</div>
        <div className="text-xs text-gray-600 mt-1">{description}</div>
      </div>
    </div>
  );
}
