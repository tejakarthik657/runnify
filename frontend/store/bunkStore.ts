import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface UserProfile {
  id: string;
  name: string;
  handle: string;
  avatar: string;
  college: string;
  collegeShort: string;
  branch: string;
  year: string;
  level: number;
  levelTitle: string;
  xp: number;
  squad: string;
  personalityTags: string[];
  achievements: {
    id: string;
    title: string;
    desc: string;
    icon: string;
    unlockedAt: string;
  }[];
}

export interface PulsePost {
  id: string;
  content: string;
  category: 'Confession' | 'Unpopular Opinion' | 'Campus Buzz' | 'Hot Take' | 'Question';
  authorTag: string; // e.g., "ECE '26 • Anonymous"
  college: string;
  timeAgo: string;
  upvotes: number;
  commentsCount: number;
  reactions: {
    fire: number;
    skull: number;
    tea: number;
    cap: number;
  };
  userReaction?: 'fire' | 'skull' | 'tea' | 'cap' | null;
  comments?: { id: string; author: string; text: string; timeAgo: string }[];
}

export interface PulsePollOption {
  id: string;
  label: string;
  votes: number;
  breakdown: Record<string, number>; // Branch breakdown
}

export interface PulsePoll {
  id: string;
  question: string;
  context: string;
  totalVotes: number;
  options: PulsePollOption[];
  userVotedOptionId?: string | null;
}

export interface MysteryEpisode {
  id: string;
  episodeNumber: string;
  title: string;
  subtitle: string;
  status: 'Active' | 'Solved' | 'Locked';
  expiresIn: string;
  clues: {
    id: string;
    number: number;
    type: 'Cipher' | 'Broadcast' | 'Archive' | 'Terminal';
    title: string;
    content: string;
    hint: string;
    isDiscovered: boolean;
  }[];
  theories: {
    id: string;
    author: string;
    branch: string;
    theory: string;
    upvotes: number;
    userUpvoted?: boolean;
    timeAgo: string;
  }[];
}

export interface Squad {
  id: string;
  name: string;
  motto: string;
  avatar: string;
  points: number;
  rank: number;
  membersCount: number;
  college: string;
  topBadge: string;
}

export interface LoungeRoom {
  id: string;
  title: string;
  topic: string;
  host: string;
  listenersCount: number;
  speakersCount: number;
  isLive: boolean;
  tags: string[];
  messages: { id: string; user: string; text: string; time: string; avatar: string }[];
}

interface BunkState {
  user: UserProfile;
  pulseFeed: PulsePost[];
  currentPoll: PulsePoll;
  mystery: MysteryEpisode;
  squads: Squad[];
  lounges: LoungeRoom[];
  campusBattle: {
    homeCollege: string;
    rivalCollege: string;
    homeScore: number;
    rivalScore: number;
    activeEvent: string;
  };
  
  // Actions
  updateUser: (updates: Partial<UserProfile>) => void;
  reactToPost: (postId: string, reaction: 'fire' | 'skull' | 'tea' | 'cap') => void;
  addPulsePost: (content: string, category: PulsePost['category'], isAnon?: boolean) => void;
  addComment: (postId: string, text: string) => void;
  votePoll: (optionId: string) => void;
  submitTheory: (theoryText: string) => void;
  upvoteTheory: (theoryId: string) => void;
  addLoungeMessage: (roomId: string, text: string) => void;
}

const INITIAL_USER: UserProfile = {
  id: 'usr-rahul-01',
  name: 'Rahul Sharma',
  handle: '@rahul_k',
  avatar: '⚡',
  college: 'Kakatiya Institute of Technology & Science (KITSW)',
  collegeShort: 'KITSW',
  branch: 'CSE',
  year: '2nd Year',
  level: 3,
  levelTitle: 'Campus Insider',
  xp: 1450,
  squad: 'Ctrl Alt Elite',
  personalityTags: ['Late Night Coder', 'Canteen Philosopher', 'Hostel 3', 'Startup Curious', 'Bunk Loyalist'],
  achievements: [
    { id: 'ach-1', title: 'Midnight Detective', desc: 'Cracked Episode 001 first cipher clue', icon: '🕵️', unlockedAt: '2 hrs ago' },
    { id: 'ach-2', title: 'Canteen Politician', desc: 'Your hot take garnered 150+ tea reactions', icon: '☕', unlockedAt: 'Yesterday' },
    { id: 'ach-3', title: 'Vibe Sync', desc: 'Completed a 100% blind connect identity reveal', icon: '🔮', unlockedAt: '3 days ago' },
  ],
};

const INITIAL_FEED: PulsePost[] = [
  {
    id: 'post-1',
    content: "The canteen vendor secretly gave 20% extra fries to anyone who ordered in Telugu today and honestly? Respect the culture hustle.",
    category: 'Campus Buzz',
    authorTag: "CSE '26 • Anonymous",
    college: 'KITSW',
    timeAgo: '12m ago',
    upvotes: 218,
    commentsCount: 34,
    reactions: { fire: 184, skull: 45, tea: 92, cap: 4 },
    comments: [
      { id: 'c-1', author: 'Hostel 2 Veteran', text: 'Bro don’t leak the glitch, now the 1st years will swarm it 😭', timeAgo: '8m ago' },
      { id: 'c-2', author: 'ECE Rebel', text: 'Happened with tea samosa too. Unmatched diplomacy.', timeAgo: '4m ago' }
    ]
  },
  {
    id: 'post-2',
    content: "Unpopular opinion: 85% of people hyping up competitive coding can't build a basic responsive landing page without 14 tutorials.",
    category: 'Unpopular Opinion',
    authorTag: "IT '25 • Anonymous",
    college: 'KITSW',
    timeAgo: '45m ago',
    upvotes: 382,
    commentsCount: 68,
    reactions: { fire: 290, skull: 120, tea: 140, cap: 22 },
    comments: [
      { id: 'c-3', author: 'LeetCode 1000', text: 'You came for blood today huh', timeAgo: '30m ago' },
      { id: 'c-4', author: 'Frontend Dev', text: 'FACTS. Centering a div is real engineering.', timeAgo: '20m ago' }
    ]
  },
  {
    id: 'post-3',
    content: "Did anyone else notice someone set the lab projector wallpaper to the HOD's LinkedIn post from 2014 at 7:45 AM? Who did this masterpiece?",
    category: 'Confession',
    authorTag: "Mech '27 • Anonymous",
    college: 'KITSW',
    timeAgo: '2h ago',
    upvotes: 512,
    commentsCount: 89,
    reactions: { fire: 450, skull: 320, tea: 190, cap: 2 },
    comments: [
      { id: 'c-5', author: 'Lab Assistant', text: 'We have logs... just saying 👀', timeAgo: '1h ago' }
    ]
  },
  {
    id: 'post-4',
    content: "Why do professors schedule surprise viva on the exact Monday morning following fest weekend? This is psychological warfare.",
    category: 'Hot Take',
    authorTag: "Civil '26 • Anonymous",
    college: 'KITSW',
    timeAgo: '4h ago',
    upvotes: 198,
    commentsCount: 19,
    reactions: { fire: 110, skull: 145, tea: 50, cap: 1 },
    comments: []
  }
];

const INITIAL_POLL: PulsePoll = {
  id: 'poll-01',
  question: "What is the single most overrated thing about college life right now?",
  context: "1,848 verified students from KITSW & Warangal colleges have voted. Tap to see the branch breakdown.",
  totalVotes: 1848,
  options: [
    {
      id: 'opt-1',
      label: 'The 75% Mandatory Attendance Trap',
      votes: 842,
      breakdown: { CSE: 48, ECE: 44, MECH: 54, CIVIL: 42 }
    },
    {
      id: 'opt-2',
      label: 'Overhyped Annual College Fests',
      votes: 410,
      breakdown: { CSE: 22, ECE: 28, MECH: 18, CIVIL: 24 }
    },
    {
      id: 'opt-3',
      label: 'Placement Season Hype & Fearmongering',
      votes: 395,
      breakdown: { CSE: 24, ECE: 18, MECH: 19, CIVIL: 22 }
    },
    {
      id: 'opt-4',
      label: 'Four-person "Group" Projects (where 1 works)',
      votes: 201,
      breakdown: { CSE: 6, ECE: 10, MECH: 9, CIVIL: 12 }
    }
  ]
};

const INITIAL_MYSTERY: MysteryEpisode = {
  id: 'ep-001',
  episodeNumber: 'EPISODE 001',
  title: 'The Midnight Transmission',
  subtitle: 'An encrypted packet intercepted by the central campus node at 00:03 AM.',
  status: 'Active',
  expiresIn: '08h 24m remaining',
  clues: [
    {
      id: 'clue-1',
      number: 1,
      type: 'Terminal',
      title: 'Decoded Packet Header',
      content: 'SYS_SIG: "I have no voice, yet thousands speak through me every night behind Block 4."',
      hint: 'The place where students gather when classes end and tea brews.',
      isDiscovered: true
    },
    {
      id: 'clue-2',
      number: 2,
      type: 'Cipher',
      title: 'Rot-13 Fragment',
      content: 'GBHEANZRAG BS ABQRF: "Check the third table under the banyan tree for the chalk coordinates."',
      hint: 'Look for the coordinates carved into stone near the reading lawn.',
      isDiscovered: true
    },
    {
      id: 'clue-3',
      number: 3,
      type: 'Archive',
      title: 'The Missing Batch Key',
      content: 'A legacy 2021 student handle "Ghost_Sem4" left a keyfile locked with 200 campus theory votes.',
      hint: 'Campus community needs 50 more votes to unlock the final audio leak.',
      isDiscovered: false
    }
  ],
  theories: [
    {
      id: 'th-1',
      author: 'Backbenchers Squad',
      branch: 'CSE',
      theory: 'The transmission is actually an upcoming secret hackathon announcement organized by the alumni council, disguised as an ARG puzzle.',
      upvotes: 89,
      timeAgo: '1h ago'
    },
    {
      id: 'th-2',
      author: 'CipherWhiz',
      branch: 'ECE',
      theory: 'Coordinates match the old server room behind auditorium that supposedly has uninterrupted 1Gbps fiber optic line.',
      upvotes: 64,
      timeAgo: '2h ago'
    },
    {
      id: 'th-3',
      author: 'Night_Owl_4',
      branch: 'IT',
      theory: 'It is a prank by 4th years before their farewell to make 2nd years run around campus searching for non-existent USB drives!',
      upvotes: 42,
      timeAgo: '3h ago'
    }
  ]
};

const INITIAL_SQUADS: Squad[] = [
  {
    id: 'sq-1',
    name: 'Backbenchers Club',
    motto: 'Last bench, first place.',
    avatar: '⚡',
    points: 2140,
    rank: 1,
    membersCount: 8,
    college: 'KITSW',
    topBadge: 'Mystery Pioneers'
  },
  {
    id: 'sq-2',
    name: 'Ctrl Alt Elite',
    motto: 'Rebooting campus reality.',
    avatar: '👾',
    points: 1890,
    rank: 2,
    membersCount: 6,
    college: 'KITSW',
    topBadge: 'Hack Masters'
  },
  {
    id: 'sq-3',
    name: 'Night Owls Syndicate',
    motto: 'We wake up when the hostel Wi-Fi speeds up.',
    avatar: '🦉',
    points: 1650,
    rank: 3,
    membersCount: 7,
    college: 'KITSW',
    topBadge: 'Lounge Curators'
  },
  {
    id: 'sq-4',
    name: 'Syntax Errors',
    motto: 'Works on my machine.',
    avatar: '💥',
    points: 1420,
    rank: 4,
    membersCount: 5,
    college: 'KITSW',
    topBadge: 'Meme Lords'
  }
];

const INITIAL_LOUNGES: LoungeRoom[] = [
  {
    id: 'room-1',
    title: '🔥 1 AM Tech Rants & Dumb Startup Ideas',
    topic: 'Pitching apps that will either make $10M or get us suspended',
    host: 'Vikram (CSE 3rd Yr)',
    listenersCount: 54,
    speakersCount: 4,
    isLive: true,
    tags: ['Tech', 'Startups', 'Unhinged'],
    messages: [
      { id: 'm-1', user: 'Harsha (ECE)', text: 'What if we build an AI proxy that automatically attends 8:30 AM lectures via camera feed?', time: '01:04', avatar: '🤖' },
      { id: 'm-2', user: 'Sneha (CSE)', text: 'The facial recognition at our gate can barely recognize humans bro 😂', time: '01:06', avatar: '✨' },
      { id: 'm-3', user: 'Vikram (Host)', text: 'Pitch it as "Edge computing attendance disruptor" and YC will write a check', time: '01:07', avatar: '🚀' }
    ]
  },
  {
    id: 'room-2',
    title: '💀 Canteen Samosa vs Mess Biryani: The Final Trial',
    topic: 'Debating culinary war crimes committed across Warangal hostels',
    host: 'Pranay (Mech)',
    listenersCount: 38,
    speakersCount: 6,
    isLive: true,
    tags: ['Food', 'Hostel Life', 'War'],
    messages: [
      { id: 'm-4', user: 'Ananya (IT)', text: 'Whoever invented Sunday chicken curry was trying to test our immune systems', time: '00:52', avatar: '🍗' },
      { id: 'm-5', user: 'Pranay (Host)', text: 'Canteen tea with ginger is the only reason 60% of us pass internal exams', time: '00:58', avatar: '☕' }
    ]
  },
  {
    id: 'room-3',
    title: '⚡ Placement Season Anxiety & Resume Roasts',
    topic: 'Anonymous resume reviews and survival advice without the LinkedIn cringe',
    host: 'Karthik (Alum)',
    listenersCount: 71,
    speakersCount: 5,
    isLive: true,
    tags: ['Careers', 'Real Talk', 'Prep'],
    messages: [
      { id: 'm-6', user: 'Anon 2026', text: 'Do recruiters actually read personal projects or just search for leetcode keywords?', time: '00:44', avatar: '💼' }
    ]
  }
];

export const useBunkStore = create<BunkState>()(
  persist(
    (set) => ({
      user: INITIAL_USER,
      pulseFeed: INITIAL_FEED,
      currentPoll: INITIAL_POLL,
      mystery: INITIAL_MYSTERY,
      squads: INITIAL_SQUADS,
      lounges: INITIAL_LOUNGES,
      campusBattle: {
        homeCollege: 'KITSW Warangal',
        rivalCollege: 'NIT Warangal',
        homeScore: 16840,
        rivalScore: 16120,
        activeEvent: 'Cross-Campus Midnight Cipher & Pulse Clout'
      },

      updateUser: (updates) =>
        set((state) => ({
          user: { ...state.user, ...updates }
        })),

      reactToPost: (postId, reaction) =>
        set((state) => ({
          pulseFeed: state.pulseFeed.map((post) => {
            if (post.id !== postId) return post;
            const currentReaction = post.userReaction;
            const reactions = { ...post.reactions };
            let upvotes = post.upvotes;

            if (currentReaction === reaction) {
              reactions[reaction] = Math.max(0, reactions[reaction] - 1);
              upvotes = Math.max(0, upvotes - 1);
              return { ...post, reactions, upvotes, userReaction: null };
            }

            if (currentReaction) {
              reactions[currentReaction] = Math.max(0, reactions[currentReaction] - 1);
            } else {
              upvotes += 1;
            }

            reactions[reaction] += 1;
            return { ...post, reactions, upvotes, userReaction: reaction };
          })
        })),

      addPulsePost: (content, category, isAnon = true) =>
        set((state) => {
          const newPost: PulsePost = {
            id: `post-${Date.now()}`,
            content,
            category,
            authorTag: isAnon ? `${state.user.branch} '${state.user.year.slice(0, 2)} • Anonymous` : state.user.name,
            college: state.user.collegeShort,
            timeAgo: 'Just now',
            upvotes: 1,
            commentsCount: 0,
            reactions: { fire: 1, skull: 0, tea: 0, cap: 0 },
            userReaction: 'fire',
            comments: []
          };
          return {
            pulseFeed: [newPost, ...state.pulseFeed],
            user: { ...state.user, xp: state.user.xp + 50 }
          };
        }),

      addComment: (postId, text) =>
        set((state) => ({
          pulseFeed: state.pulseFeed.map((post) => {
            if (post.id !== postId) return post;
            const newComment = {
              id: `c-${Date.now()}`,
              author: `${state.user.name.split(' ')[0]} (${state.user.branch})`,
              text,
              timeAgo: 'Just now'
            };
            return {
              ...post,
              commentsCount: post.commentsCount + 1,
              comments: [...(post.comments || []), newComment]
            };
          })
        })),

      votePoll: (optionId) =>
        set((state) => {
          if (state.currentPoll.userVotedOptionId) return state; // Already voted
          const updatedOptions = state.currentPoll.options.map((opt) => {
            if (opt.id === optionId) {
              return { ...opt, votes: opt.votes + 1 };
            }
            return opt;
          });
          return {
            currentPoll: {
              ...state.currentPoll,
              totalVotes: state.currentPoll.totalVotes + 1,
              options: updatedOptions,
              userVotedOptionId: optionId
            },
            user: { ...state.user, xp: state.user.xp + 75 }
          };
        }),

      submitTheory: (theoryText) =>
        set((state) => {
          const newTheory = {
            id: `th-${Date.now()}`,
            author: state.user.squad || state.user.name,
            branch: state.user.branch,
            theory: theoryText,
            upvotes: 1,
            userUpvoted: true,
            timeAgo: 'Just now'
          };
          return {
            mystery: {
              ...state.mystery,
              theories: [newTheory, ...state.mystery.theories]
            },
            user: { ...state.user, xp: state.user.xp + 100 }
          };
        }),

      upvoteTheory: (theoryId) =>
        set((state) => ({
          mystery: {
            ...state.mystery,
            theories: state.mystery.theories.map((th) => {
              if (th.id !== theoryId) return th;
              const isUpvoted = th.userUpvoted;
              return {
                ...th,
                upvotes: isUpvoted ? th.upvotes - 1 : th.upvotes + 1,
                userUpvoted: !isUpvoted
              };
            })
          }
        })),

      addLoungeMessage: (roomId, text) =>
        set((state) => ({
          lounges: state.lounges.map((room) => {
            if (room.id !== roomId) return room;
            return {
              ...room,
              messages: [
                ...room.messages,
                {
                  id: `m-${Date.now()}`,
                  user: `${state.user.name} (${state.user.branch})`,
                  text,
                  time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                  avatar: state.user.avatar
                }
              ]
            };
          })
        }))
    }),
    {
      name: 'bunk-storage-v1'
    }
  )
);

