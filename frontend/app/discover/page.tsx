'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Compass,
  Flame,
  Skull,
  Coffee,
  Bookmark,
  MessageSquare,
  Sparkles,
  Share2,
  TrendingUp,
  MapPin
} from 'lucide-react';
import { useBunkStore } from '../../store/bunkStore';

export default function DiscoverPage() {
  const { discoverPosts, reactToDiscoverPost, activeCampus } = useBunkStore();
  const [selectedTopic, setSelectedTopic] = useState<string>('All');

  const topicPills = [
    'All',
    '#CampusMyths',
    '#ProfQuotes',
    '#MidnightCanteen',
    '#PlacementsReality',
    '#HostelHacks'
  ];

  const filteredPosts = selectedTopic === 'All'
    ? discoverPosts
    : discoverPosts.filter((p) => p.topic === selectedTopic);

  return (
    <div className="space-y-6">
      {/* Discover Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#1F2330]">
        <div>
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#8B5CF6]">
            Curated Campus Culture
          </span>
          <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2 mt-0.5">
            <Compass size={22} className="text-[#8B5CF6]" />
            Discover
          </h1>
          <p className="text-xs text-[#828B9E] mt-0.5">
            Serendipitous campus insights without algorithmic doomscrolling.
          </p>
        </div>

        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#161822] border border-[#2A2F42] text-xs font-semibold text-[#CBD5E1] shrink-0 self-start sm:self-auto">
          <MapPin size={13} className="text-[#CCFF00]" />
          <span>Trending in {activeCampus}</span>
        </div>
      </div>

      {/* Horizontal Swipeable Topic Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {topicPills.map((pill) => (
          <button
            key={pill}
            onClick={() => setSelectedTopic(pill)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
              selectedTopic === pill
                ? 'bg-[#8B5CF6] text-white shadow-md shadow-[#8B5CF6]/30'
                : 'bg-[#161822] border border-[#1F2330] text-[#828B9E] hover:text-[#CBD5E1] hover:border-[#2A2F42]'
            }`}
          >
            {pill}
          </button>
        ))}
      </div>

      {/* Cross-Campus Spotlight Card */}
      <div className="rounded-[20px] bg-gradient-to-r from-[#161822] to-[#1E212D] border border-[#8B5CF6]/30 p-5 space-y-2.5 relative overflow-hidden shadow-lg">
        <div className="flex items-center justify-between text-xs">
          <span className="font-mono text-[10px] uppercase font-bold tracking-wider text-[#8B5CF6] flex items-center gap-1.5">
            <Sparkles size={13} />
            Cross-Campus Spotlight
          </span>
          <span className="text-[10px] font-mono text-[#828B9E]">NIT Warangal Hub</span>
        </div>
        <h3 className="text-sm font-bold text-white leading-snug">
          &ldquo;NITW hostellers report a 92% satisfaction drop after 10 PM Wi-Fi throttle was instituted this week.&rdquo;
        </h3>
        <p className="text-xs text-[#828B9E]">
          KITSW students reacted with 180+ fire and solidarity memes across the Warangal network.
        </p>
      </div>

      {/* Asymmetric Masonry Opinion Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredPosts.map((post) => (
          <div
            key={post.id}
            className="rounded-[20px] bg-[#161822] border border-[#1F2330] hover:border-[#2A2F42] hover:bg-[#1E212D] p-5 space-y-3.5 transition-all shadow-sm flex flex-col justify-between"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-[#8B5CF6] bg-[#8B5CF6]/10 px-2.5 py-0.5 rounded-full">
                  {post.topic}
                </span>
                <span className="text-[10px] font-mono text-[#828B9E]">{post.timeAgo}</span>
              </div>

              <p className="text-xs sm:text-sm text-[#F8FAFC] leading-relaxed font-normal">
                {post.content}
              </p>
            </div>

            <div className="pt-3 border-t border-[#1F2330] flex items-center justify-between text-xs">
              <span className="text-[11px] font-bold text-[#828B9E] flex items-center gap-1">
                {post.isShadow ? '🎭' : '⚡'}
                <span>{post.authorTag}</span>
              </span>

              {/* Reaction Sparks */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => reactToDiscoverPost(post.id, 'fire')}
                  className={`p-1.5 px-2 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors ${
                    post.userReaction === 'fire'
                      ? 'bg-[#FF4D6D]/20 text-[#FF4D6D] font-bold'
                      : 'text-[#828B9E] hover:text-white hover:bg-white/5'
                  }`}
                  title="Fire take"
                >
                  <Flame size={13} />
                  <span>{post.reactions.fire}</span>
                </button>

                <button
                  onClick={() => reactToDiscoverPost(post.id, 'skull')}
                  className={`p-1.5 px-2 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors ${
                    post.userReaction === 'skull'
                      ? 'bg-[#00F0FF]/20 text-[#00F0FF] font-bold'
                      : 'text-[#828B9E] hover:text-white hover:bg-white/5'
                  }`}
                  title="Dead laughing"
                >
                  <Skull size={13} />
                  <span>{post.reactions.skull}</span>
                </button>

                <button
                  onClick={() => reactToDiscoverPost(post.id, 'tea')}
                  className={`p-1.5 px-2 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors ${
                    post.userReaction === 'tea'
                      ? 'bg-[#F59E0B]/20 text-[#F59E0B] font-bold'
                      : 'text-[#828B9E] hover:text-white hover:bg-white/5'
                  }`}
                  title="Spill tea"
                >
                  <Coffee size={13} />
                  <span>{post.reactions.tea}</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
