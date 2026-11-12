'use client';

import { create } from 'zustand';
import api from '../services/api';

export interface PulseOption {
  id: string;
  text: string;
  votes: number;
  pctOverall: number;
  pctBranch: number;
  pctYear: number;
  pctAllIndia: number;
}

export interface PulseDilemma {
  id: string;
  label: string;
  closesIn: string;
  question: string;
  totalVotes: number;
  cohortCount: number;
  options: PulseOption[];
  userVotedId: string | null;
  comments: unknown[];
}

export interface CampusClash {
  id: string;
  title: string;
  campusA: { name: string; score: number; pct: number };
  campusB: { name: string; score: number; pct: number };
  cloutLead: string;
}

export interface DiscoverPost {
  id: string;
  content: string;
  topic: string;
  authorTag: string;
  isShadow: boolean;
  college: string;
  timeAgo: string;
  reactions: { fire: number; skull: number; tea: number; cap: number };
  userReaction: 'fire' | 'skull' | 'tea' | 'cap' | null;
  commentsCount: number;
}

export interface BunkUser {
  name: string;
  handle: string;
  avatar: string;
  college: string;
  collegeShort: string;
  branch: string;
  year: string;
  karma: { questionsSparked: number; votedInPulses: number; communityImpact: string };
  personalityTags: string[];
  isShadowMode: boolean;
  savedTakesCount: number;
}

interface BunkState {
  user: BunkUser;
  activeCampus: string;
  availableCampuses: string[];
  todayPulse: PulseDilemma | null;
  campusClashes: CampusClash[];
  discoverPosts: DiscoverPost[];
  afterHoursRooms: unknown[];
  isCreateModalOpen: boolean;
  isLoading: boolean;
  error: string | null;
  setActiveCampus: (campus: string) => void;
  loadBootstrap: () => Promise<void>;
  voteTodayPulse: (optionId: string) => Promise<void>;
  reactToDiscoverPost: (postId: string, reaction: 'fire' | 'skull' | 'tea' | 'cap') => Promise<void>;
  addDiscoverPost: (content: string, topic: string, isShadow: boolean) => Promise<void>;
  openCreateModal: () => void;
  closeCreateModal: () => void;
  addPersonalityTag: (tag: string) => void;
  removePersonalityTag: (tag: string) => void;
}

const EMPTY_USER: BunkUser = {
  name: '',
  handle: '',
  avatar: '?',
  college: '',
  collegeShort: '',
  branch: '',
  year: '',
  karma: { questionsSparked: 0, votedInPulses: 0, communityImpact: 'New member' },
  personalityTags: [],
  isShadowMode: false,
  savedTakesCount: 0,
};

function mapUser(user: Record<string, unknown> | null | undefined): BunkUser {
  const username = typeof user?.username === 'string' ? user.username : '';
  const campus = typeof user?.campus === 'string' ? user.campus : (typeof user?.city === 'string' ? user.city : '');
  return {
    ...EMPTY_USER,
    name: username,
    handle: username ? `@${username}` : '',
    avatar: username.slice(0, 1).toUpperCase() || '?',
    college: campus,
    collegeShort: campus,
    branch: typeof user?.branch === 'string' ? user.branch : '',
    year: typeof user?.year === 'string' ? user.year : '',
    personalityTags: Array.isArray(user?.interests) ? user.interests as string[] : [],
  };
}

export const useBunkStore = create<BunkState>((set, get) => ({
  user: EMPTY_USER,
  activeCampus: '',
  availableCampuses: [],
  todayPulse: null,
  campusClashes: [],
  discoverPosts: [],
  afterHoursRooms: [],
  isCreateModalOpen: false,
  isLoading: true,
  error: null,

  setActiveCampus: (campus) => {
    set({ activeCampus: campus });
    void get().loadBootstrap();
  },

  loadBootstrap: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await api.get('/api/bunk/bootstrap', { params: { campus: get().activeCampus || undefined } });
      set({
        user: mapUser(data.user),
        activeCampus: data.activeCampus,
        availableCampuses: data.availableCampuses || [data.activeCampus],
        todayPulse: data.todayPulse,
        campusClashes: data.campusClashes || [],
        discoverPosts: data.discoverPosts || [],
        afterHoursRooms: data.afterHoursRooms || [],
        isLoading: false,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to load your campus';
      set({ isLoading: false, error: message });
    }
  },

  voteTodayPulse: async (optionId) => {
    const poll = get().todayPulse;
    if (!poll) return;
    const { data } = await api.post('/api/bunk/poll/vote', { pollId: poll.id, optionId }, { params: { campus: get().activeCampus } });
    set({ todayPulse: data.poll });
  },

  reactToDiscoverPost: async (postId, reaction) => {
    const { data } = await api.post(`/api/bunk/pulse/${postId}/react`, { reaction }, { params: { campus: get().activeCampus } });
    set((state) => ({ discoverPosts: state.discoverPosts.map((post) => post.id === postId ? data.post : post) }));
  },

  addDiscoverPost: async (content, topic, isShadow) => {
    const { data } = await api.post('/api/bunk/pulse', { content, topic, isShadow }, { params: { campus: get().activeCampus } });
    set((state) => ({ discoverPosts: [data.post, ...state.discoverPosts] }));
  },

  openCreateModal: () => set({ isCreateModalOpen: true }),
  closeCreateModal: () => set({ isCreateModalOpen: false }),
  addPersonalityTag: (tag) => {
    const formatted = tag.startsWith('#') ? tag : `#${tag}`;
    if (get().user.personalityTags.includes(formatted)) return;
    const interests = [...get().user.personalityTags, formatted];
    set((state) => ({ user: { ...state.user, personalityTags: interests } }));
    void api.patch('/api/bunk/profile', { interests });
  },
  removePersonalityTag: (tag) => {
    const interests = get().user.personalityTags.filter((item) => item !== tag);
    set((state) => ({ user: { ...state.user, personalityTags: interests } }));
    void api.patch('/api/bunk/profile', { interests });
  },
}));
