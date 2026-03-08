'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Zap, Check, Edit2, Save, X } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import api from '../../services/api';
import { toast } from 'react-hot-toast';

const FACTIONS = [
  {
    id: 'red' as const,
    name: 'Red Legion',
    color: '#FF4444',
    description: 'Conquer with fire and aggression. Dominate through strength and raw power.',
    icon: '🔴',
    tagline: 'Strength Through Fire',
    philosophy: 'The Red Legion believes that territory is conquered through bold action and unwavering determination. We are the aggressive force that reshapes the world.',
    strengths: ['Direct confrontation', 'Rapid conquest', 'Intimidation factor'],
  },
  {
    id: 'blue' as const,
    name: 'Blue Syndicate',
    color: '#4488FF',
    description: 'Control through strategy and precision. Outsmart your opponents with calculated moves.',
    icon: '🔵',
    tagline: 'Strategy Over Strength',
    philosophy: 'The Blue Syndicate masters the art of strategy. Every hex is captured through careful planning, analysis, and precision execution.',
    strengths: ['Strategic planning', 'Territorial control', 'Intelligent defense'],
  },
  {
    id: 'green' as const,
    name: 'Green Nomads',
    color: '#44FF88',
    description: 'Freedom through movement. Explore and liberate territories across the map.',
    icon: '🟢',
    tagline: 'Freedom Through Movement',
    philosophy: 'The Green Nomads value mobility and exploration. We liberate territories through constant movement and freedom-based conquest.',
    strengths: ['High mobility', 'Exploration bonuses', 'Dynamic control'],
  },
];

export default function FactionPage() {
  const { user, updateUser } = useAuthStore();
  const [selectedFaction, setSelectedFaction] = useState<'red' | 'blue' | 'green' | null>(
    (user?.faction as 'red' | 'blue' | 'green' | null) || null
  );
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanged, setHasChanged] = useState(false);

  useEffect(() => {
    if (selectedFaction !== (user?.faction as 'red' | 'blue' | 'green' | null)) {
      setHasChanged(true);
    } else {
      setHasChanged(false);
    }
  }, [selectedFaction, user?.faction]);

  const handleSaveFaction = async () => {
    if (!selectedFaction) {
      toast.error('Please select a faction');
      return;
    }

    setIsSaving(true);
    try {
      const response = await api.patch('/user/me/faction', { faction: selectedFaction });
      updateUser({ faction: selectedFaction, factionJoinedAt: new Date() });
      setIsEditing(false);
      setHasChanged(false);
      toast.success(`Joined ${FACTIONS.find(f => f.id === selectedFaction)?.name}! 🎉`);
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || 'Failed to change faction';
      toast.error(errorMsg);
      setSelectedFaction(user?.faction as 'red' | 'blue' | 'green' | null);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setSelectedFaction(user?.faction as 'red' | 'blue' | 'green' | null);
    setIsEditing(false);
    setHasChanged(false);
  };

  const currentFaction = FACTIONS.find(f => f.id === user?.faction);

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-[#F0F7F4] pt-6 pb-24 px-4 sm:px-6 md:pl-[280px] md:pt-8 lg:px-12">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 sm:mb-12"
        >
          <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
            <Zap size={28} className="text-[#A8D5BA] sm:w-8 sm:h-8" />
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-[#1A1A2E]">
              Choose Your <span className="text-[#A8D5BA]">Faction</span>
            </h1>
          </div>
          <p className="text-base sm:text-lg text-slate-600 max-w-2xl">
            {!user?.faction
              ? 'Welcome to the Global Territory Wars! Select your faction to begin your conquest.'
              : `You are currently leading the ${currentFaction?.name}. This is your core identity in the world.`}
          </p>
        </motion.div>

        {/* Current Status */}
        {user?.faction && !isEditing && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 sm:mb-8 p-4 sm:p-6 bg-white rounded-2xl sm:rounded-3xl border-2 shadow-sm border-[#A8D5BA]/30"
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex-1">
                <p className="text-xs sm:text-sm text-slate-500 font-semibold uppercase tracking-wide mb-2">Current Faction</p>
                <div className="flex items-start sm:items-center gap-3">
                  <span className="text-3xl sm:text-4xl flex-shrink-0">{currentFaction?.icon}</span>
                  <div className="min-w-0">
                    <h3 className="text-xl sm:text-2xl font-black" style={{ color: currentFaction?.color }}>{currentFaction?.name}</h3>
                    <p className="text-xs sm:text-sm text-slate-600 truncate">{currentFaction?.tagline}</p>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setIsEditing(true)}
                className="w-full sm:w-auto px-4 sm:px-6 py-3 rounded-xl sm:rounded-2xl bg-[#A8D5BA] hover:bg-[#92c9aa] text-white font-bold flex items-center justify-center sm:justify-start gap-2 transition-all text-sm sm:text-base"
              >
                <Edit2 size={18} />
                <span className="sm:inline">Change Faction</span>
                <span className="sm:hidden">Change</span>
              </button>
            </div>
          </motion.div>
        )}

        {/* Faction Selection Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 mb-8 sm:mb-12">
          {FACTIONS.map((faction, i) => {
            const isSelected = selectedFaction === faction.id;
            const isCurrent = user?.faction === faction.id;

            return (
              <motion.div
                key={faction.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                onClick={() => {
                  if (isEditing || !user?.faction) {
                    setSelectedFaction(faction.id);
                  }
                }}
                className={`relative group cursor-pointer transition-all duration-300 rounded-2xl sm:rounded-3xl border-3 p-5 sm:p-8 ${
                  isSelected
                    ? `border-[${faction.color}]`
                    : 'border-slate-200 hover:border-slate-300'
                } ${isEditing || !user?.faction ? 'hover:shadow-lg' : ''} ${
                  isCurrent ? 'bg-opacity-100' : 'bg-white'
                }`}
                style={
                  isSelected
                    ? {
                        borderColor: faction.color,
                        backgroundColor: `${faction.color}0a`,
                        boxShadow: `0 0 30px ${faction.color}20`,
                      }
                    : { backgroundColor: 'white' }
                }
              >
                {/* Icon */}
                <div className="text-5xl sm:text-6xl mb-3 sm:mb-4 transform transition-transform group-hover:scale-110">
                  {faction.icon}
                </div>

                {/* Faction Name */}
                <h3
                  className="text-2xl sm:text-3xl font-black mb-2"
                  style={{ color: isSelected ? faction.color : '#1A1A2E' }}
                >
                  {faction.name}
                </h3>

                {/* Tagline */}
                <p className="text-xs font-black uppercase tracking-widest text-slate-500 mb-3 sm:mb-4">
                  {faction.tagline}
                </p>

                {/* Description */}
                <p className="text-sm text-slate-600 mb-3 sm:mb-4 leading-relaxed">
                  {faction.description}
                </p>

                {/* Philosophy */}
                <p className="text-xs text-slate-500 italic mb-3 sm:mb-4 p-2 sm:p-3 bg-slate-50 rounded-lg sm:rounded-xl">
                  "{faction.philosophy}"
                </p>

                {/* Strengths */}
                <div className="mb-4 sm:mb-6">
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Key Strengths</p>
                  <ul className="space-y-1">
                    {faction.strengths.map((strength, idx) => (
                      <li key={idx} className="text-xs text-slate-600 flex items-center gap-2">
                        <span style={{ color: faction.color }} className="font-bold">✓</span>
                        {strength}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Selection Status */}
                {isSelected && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="px-3 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-black uppercase tracking-widest text-white w-full text-center"
                    style={{ backgroundColor: faction.color }}
                  >
                    ✓ SELECTED
                  </motion.div>
                )}

                {isCurrent && !isSelected && (
                  <div className="px-3 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-black uppercase tracking-widest text-white w-full text-center bg-green-500">
                    ✓ YOUR FACTION
                  </div>
                )}

                {!isSelected && !isCurrent && (
                  <div
                    className="px-3 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-black uppercase tracking-widest text-white w-full text-center transition-colors border-2"
                    style={{
                      backgroundColor: isEditing || !user?.faction ? faction.color : 'transparent',
                      borderColor: faction.color,
                      color: isEditing || !user?.faction ? 'white' : faction.color,
                    }}
                  >
                    {isEditing || !user?.faction ? 'SELECT' : 'CHOOSE'}
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Action Buttons */}
        {isEditing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center mb-8 sm:mb-12"
          >
            <button
              onClick={handleCancel}
              className="px-6 sm:px-8 py-3 sm:py-4 rounded-xl sm:rounded-2xl border-2 border-slate-300 text-slate-700 font-bold flex items-center justify-center gap-2 hover:bg-slate-50 transition-all text-sm sm:text-base"
            >
              <X size={18} className="sm:w-5 sm:h-5" />
              Cancel
            </button>
            <button
              onClick={handleSaveFaction}
              disabled={!hasChanged || isSaving}
              className={`px-6 sm:px-8 py-3 sm:py-4 rounded-xl sm:rounded-2xl text-white font-bold flex items-center justify-center gap-2 transition-all text-sm sm:text-base ${
                hasChanged && !isSaving
                  ? 'bg-[#A8D5BA] hover:bg-[#92c9aa] cursor-pointer'
                  : 'bg-slate-300 cursor-not-allowed opacity-50'
              }`}
            >
              <Save size={18} className="sm:w-5 sm:h-5" />
              {isSaving ? 'Saving...' : 'Save Faction'}
            </button>
          </motion.div>
        )}

        {/* Info Section */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6"
        >
          <div className="p-4 sm:p-6 bg-white rounded-xl sm:rounded-2xl border border-slate-200">
            <h4 className="font-black text-base sm:text-lg mb-2 sm:mb-3 text-[#1A1A2E]">🗺️ What Does Your Faction Do?</h4>
            <p className="text-sm text-slate-600 leading-relaxed">
              Your faction competes globally for territory control. As you complete runs and claim hexagons, your faction gains control over regions. Work together with faction members to dominate the world map!
            </p>
          </div>
          <div className="p-4 sm:p-6 bg-white rounded-xl sm:rounded-2xl border border-slate-200">
            <h4 className="font-black text-base sm:text-lg mb-2 sm:mb-3 text-[#1A1A2E]">⚔️ Faction Wars</h4>
            <p className="text-sm text-slate-600 leading-relaxed">
              Compete in real-time Global Territory Wars. See live faction control percentages on the map and leaderboards. Your individual territories show YOUR color, but at higher zoom levels, faction colors dominate for control visualization.
            </p>
          </div>
        </motion.div>
      </div>
    </main>
  );
}
