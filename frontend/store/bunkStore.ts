import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface PulseOption {
  id: string;
  text: string;
  votes: number;
  pctOverall: number;
  pctBranch: number;
  pctYear: number;
  pctAllIndia: number;
}

export interface PulseComment {
  id: string;
  author: string;
  branch: string;
  isShadow: boolean;
  avatar: string;
  text: string;
  timeAgo: string;
  likes: number;
}

export interface PulseDilemma {
  id: string;
  label: string;
  closesIn: string;
  question: string;
  totalVotes: number;
  cohortCount: number; // For privacy floor >= 15
  options: PulseOption[];
  userVotedId: string | null;
  comments: PulseComment[];
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
  authorTag: string; // e.g. "CSM '26"
  isShadow: boolean;
  college: string;
  timeAgo: string;
  reactions: {
    fire: number;
    skull: number;
    tea: number;
    cap: number;
  };
  userReaction?: 'fire' | 'skull' | 'tea' | 'cap' | null;
  commentsCount: number;
}

export interface AfterHoursRoom {
  id: string;
  title: string;
  topic: string;
  hostName: string;
  hostAvatar: string;
  listenersCount: number;
  speakers: { name: string; avatar: string; isSpeaking: boolean }[];
  isLive: boolean;
  tags: string[];
  fistbumpsCount: number;
  userFistbumped: boolean;
  dmUnlockedWith?: string | null;
}

interface UserProfile {
  name: string;
  handle: string;
  avatar: string;
  college: string;
  collegeShort: string;
  branch: string;
  year: string;
  karma: {
    questionsSparked: number;
    votedInPulses: number;
    communityImpact: string;
  };
  personalityTags: string[];
  isShadowMode: boolean;
  savedTakesCount: number;
}

interface BunkState {
  user: UserProfile;
  activeCampus: string;
  availableCampuses: string[];
  todayPulse: PulseDilemma;
  campusClashes: CampusClash[];
  discoverPosts: DiscoverPost[];
  afterHoursRooms: AfterHoursRoom[];
  isCreateModalOpen: boolean;

  // Actions
  setActiveCampus: (campus: string) => void;
  setUserShadowMode: (enabled: boolean) => void;
  voteTodayPulse: (optionId: string) => void;
  addPulseComment: (text: string, isShadow?: boolean) => void;
  reactToDiscoverPost: (postId: string, reaction: 'fire' | 'skull' | 'tea' | 'cap') => void;
  addDiscoverPost: (content: string, topic: string, isShadow: boolean) => void;
  fistbumpRoomUser: (roomId: string, targetUser: string) => void;
  openCreateModal: () => void;
  closeCreateModal: () => void;
  addPersonalityTag: (tag: string) => void;
  removePersonalityTag: (tag: string) => void;
}

const INITIAL_USER: UserProfile = {
  name: 'Rahul Sharma',
  handle: '@rahul_k',
  avatar: '⚡',
  college: 'Kakatiya Institute of Technology & Science',
  collegeShort: 'KITSW',
  branch: 'CSE',
  year: '2nd Year',
  karma: {
    questionsSparked: 14,
    votedInPulses: 48,
    communityImpact: 'High (Top 5%)'
  },
  personalityTags: ['#SystemsEngineering', '#LateNightCoding', '#IndieRock', '#MidnightCanteen'],
  isShadowMode: false,
  savedTakesCount: 19
};

const INITIAL_PULSE: PulseDilemma = {
  id: 'pulse-dilemma-01',
  label: "TODAY'S DILEMMA • CLOSES IN 4H",
  closesIn: '4h 18m remaining',
  question: "What's one thing everyone pretends to enjoy in college?",
  totalVotes: 1420,
  cohortCount: 148,
  userVotedId: null, // Hidden until user votes!
  options: [
    {
      id: 'opt-1',
      text: 'Late-night hackathons & grindset culture',
      votes: 539,
      pctOverall: 38,
      pctBranch: 46,
      pctYear: 41,
      pctAllIndia: 35
    },
    {
      id: 'opt-2',
      text: 'College fest organizing committees',
      votes: 454,
      pctOverall: 32,
      pctBranch: 26,
      pctYear: 32,
      pctAllIndia: 31
    },
    {
      id: 'opt-3',
      text: 'Club orientation icebreakers',
      votes: 255,
      pctOverall: 18,
      pctBranch: 17,
      pctYear: 16,
      pctAllIndia: 21
    },
    {
      id: 'opt-4',
      text: 'Hostel terrace jam sessions',
      votes: 172,
      pctOverall: 12,
      pctBranch: 11,
      pctYear: 11,
      pctAllIndia: 13
    }
  ],
  comments: [
    {
      id: 'c-1',
      author: 'Hostel 3 Insider',
      branch: "CSE '26",
      isShadow: true,
      avatar: '🎭',
      text: 'Hackathons have literally turned into 36 hours of energy drinks and debugging npm packages while trying to impress judges with ChatGPT wrappers.',
      timeAgo: '18m ago',
      likes: 64
    },
    {
      id: 'c-2',
      author: 'Ananya R.',
      branch: "ECE '25",
      isShadow: false,
      avatar: '🌸',
      text: 'Club orientation icebreakers are pure psychological endurance tests. Please do not make me do "Two Truths and a Lie" with strangers ever again.',
      timeAgo: '32m ago',
      likes: 41
    }
  ]
};

const INITIAL_CLASHES: CampusClash[] = [
  {
    id: 'clash-1',
    title: 'Warangal Derby: Midnight Pulse Clout',
    campusA: { name: 'KITSW', score: 18420, pct: 54 },
    campusB: { name: 'NIT Warangal', score: 15680, pct: 46 },
    cloutLead: 'KITSW leads by +2,740 pts'
  },
  {
    id: 'clash-2',
    title: 'Hyderabad Tech Sentiment Battle',
    campusA: { name: 'BITS Hyd', score: 12100, pct: 51 },
    campusB: { name: 'CBIT Hyd', score: 11650, pct: 49 },
    cloutLead: 'BITS leads by +450 pts'
  }
];

const INITIAL_DISCOVER: DiscoverPost[] = [
  {
    id: 'disc-1',
    topic: '#CampusMyths',
    content: "Legend has it that someone once completed an entire semester without taking printouts in the Xerox shop behind Block 2. Scientists still doubt this.",
    authorTag: "CSM '26",
    isShadow: true,
    college: 'KITSW',
    timeAgo: '24m ago',
    reactions: { fire: 142, skull: 89, tea: 54, cap: 2 },
    commentsCount: 22
  },
  {
    id: 'disc-2',
    topic: '#MidnightCanteen',
    content: "The canteen owner remembers the order of 400 hostellers by face, but the attendance biometric scanner at Main Gate forgets who you are every Tuesday.",
    authorTag: "ECE '25",
    isShadow: false,
    college: 'KITSW',
    timeAgo: '1h ago',
    reactions: { fire: 320, skull: 110, tea: 95, cap: 6 },
    commentsCount: 48
  },
  {
    id: 'disc-3',
    topic: '#PlacementsReality',
    content: "Reminder that knowing 14 CSS frameworks does not help when the interviewer asks you to invert a binary tree on a whiteboard with a dry marker.",
    authorTag: "IT '25",
    isShadow: true,
    college: 'KITSW',
    timeAgo: '2h ago',
    reactions: { fire: 412, skull: 210, tea: 120, cap: 14 },
    commentsCount: 63
  },
  {
    id: 'disc-4',
    topic: '#ProfQuotes',
    content: "\"Attendance is compulsory, but listening to me is completely optional because I cannot compete with your smartphones.\" — Legend Prof Rao today.",
    authorTag: "MECH '26",
    isShadow: false,
    college: 'KITSW',
    timeAgo: '3h ago',
    reactions: { fire: 290, skull: 180, tea: 88, cap: 0 },
    commentsCount: 35
  }
];

const INITIAL_ROOMS: AfterHoursRoom[] = [
  {
    id: 'room-1',
    title: 'Anyone awake at Block 4? Discussing AI hype vs doom',
    topic: 'Late-night existential coding debates & whether junior roles are dying',
    hostName: 'Vikram',
    hostAvatar: '🚀',
    listenersCount: 23,
    speakers: [
      { name: 'Vikram (Host)', avatar: '🚀', isSpeaking: true },
      { name: 'Priya', avatar: '🌸', isSpeaking: false },
      { name: 'Arjun', avatar: '👾', isSpeaking: false }
    ],
    isLive: true,
    tags: ['TechHype', 'LateNight', 'Block4'],
    fistbumpsCount: 8,
    userFistbumped: false,
    dmUnlockedWith: null
  },
  {
    id: 'room-2',
    title: 'Canteen Samosa Chutney formula is mathematically unstable',
    topic: 'Unfiltered culinary review of Warangal campus food',
    hostName: 'Pranay',
    hostAvatar: '☕',
    listenersCount: 16,
    speakers: [
      { name: 'Pranay (Host)', avatar: '☕', isSpeaking: true },
      { name: 'Sneha', avatar: '✨', isSpeaking: false }
    ],
    isLive: true,
    tags: ['FoodWars', 'HostelSurvival'],
    fistbumpsCount: 4,
    userFistbumped: false,
    dmUnlockedWith: null
  }
];

export const useBunkStore = create<BunkState>()(
  persist(
    (set) => ({
      user: INITIAL_USER,
      activeCampus: 'KITSW',
      availableCampuses: ['KITSW', 'NIT Warangal', 'BITS Hyderabad', 'CBIT Hyderabad'],
      todayPulse: INITIAL_PULSE,
      campusClashes: INITIAL_CLASHES,
      discoverPosts: INITIAL_DISCOVER,
      afterHoursRooms: INITIAL_ROOMS,
      isCreateModalOpen: false,

      setActiveCampus: (campus) => set({ activeCampus: campus }),

      setUserShadowMode: (enabled) =>
        set((state) => ({
          user: { ...state.user, isShadowMode: enabled }
        })),

      voteTodayPulse: (optionId) =>
        set((state) => {
          if (state.todayPulse.userVotedId) return state; // Already voted
          const updatedOptions = state.todayPulse.options.map((opt) => {
            if (opt.id === optionId) {
              return { ...opt, votes: opt.votes + 1 };
            }
            return opt;
          });
          return {
            todayPulse: {
              ...state.todayPulse,
              totalVotes: state.todayPulse.totalVotes + 1,
              userVotedId: optionId,
              options: updatedOptions
            },
            user: {
              ...state.user,
              karma: {
                ...state.user.karma,
                votedInPulses: state.user.karma.votedInPulses + 1
              }
            }
          };
        }),

      addPulseComment: (text, isShadow = false) =>
        set((state) => {
          const newComment: PulseComment = {
            id: `c-${Date.now()}`,
            author: isShadow ? 'Shadow Insider' : state.user.name,
            branch: `${state.user.branch} '26`,
            isShadow,
            avatar: isShadow ? '🎭' : state.user.avatar,
            text,
            timeAgo: 'Just now',
            likes: 1
          };
          return {
            todayPulse: {
              ...state.todayPulse,
              comments: [newComment, ...state.todayPulse.comments]
            }
          };
        }),

      reactToDiscoverPost: (postId, reaction) =>
        set((state) => ({
          discoverPosts: state.discoverPosts.map((post) => {
            if (post.id !== postId) return post;
            const currentReaction = post.userReaction;
            const reactions = { ...post.reactions };

            if (currentReaction === reaction) {
              reactions[reaction] = Math.max(0, reactions[reaction] - 1);
              return { ...post, reactions, userReaction: null };
            }

            if (currentReaction) {
              reactions[currentReaction] = Math.max(0, reactions[currentReaction] - 1);
            }
            reactions[reaction] += 1;
            return { ...post, reactions, userReaction: reaction };
          })
        })),

      addDiscoverPost: (content, topic, isShadow) =>
        set((state) => {
          const newPost: DiscoverPost = {
            id: `disc-${Date.now()}`,
            content,
            topic: topic.startsWith('#') ? topic : `#${topic}`,
            authorTag: isShadow ? `${state.user.branch} '26 • Shadow` : `${state.user.name.split(' ')[0]} (${state.user.branch})`,
            isShadow,
            college: state.activeCampus,
            timeAgo: 'Just now',
            reactions: { fire: 1, skull: 0, tea: 0, cap: 0 },
            userReaction: 'fire',
            commentsCount: 0
          };
          return {
            discoverPosts: [newPost, ...state.discoverPosts],
            user: {
              ...state.user,
              karma: {
                ...state.user.karma,
                questionsSparked: state.user.karma.questionsSparked + 1
              }
            }
          };
        }),

      fistbumpRoomUser: (roomId, targetUser) =>
        set((state) => ({
          afterHoursRooms: state.afterHoursRooms.map((room) => {
            if (room.id !== roomId) return room;
            return {
              ...room,
              fistbumpsCount: room.fistbumpsCount + 1,
              userFistbumped: true,
              dmUnlockedWith: targetUser
            };
          })
        })),

      openCreateModal: () => set({ isCreateModalOpen: true }),
      closeCreateModal: () => set({ isCreateModalOpen: false }),

      addPersonalityTag: (tag) =>
        set((state) => {
          const formatted = tag.startsWith('#') ? tag : `#${tag}`;
          if (state.user.personalityTags.includes(formatted)) return state;
          return {
            user: {
              ...state.user,
              personalityTags: [...state.user.personalityTags, formatted]
            }
          };
        }),

      removePersonalityTag: (tag) =>
        set((state) => ({
          user: {
            ...state.user,
            personalityTags: state.user.personalityTags.filter((t) => t !== tag)
          }
        }))
    }),
    {
      name: 'bunk-design-system-store-v1'
    }
  )
);
