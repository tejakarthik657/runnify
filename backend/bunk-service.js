// backend/bunk-service.js
// Dedicated backend controller & router for BUNK Campus Universe
const express = require('express');
const router = express.Router();

let pulsePosts = [
  {
    id: 'post-1',
    content: "The canteen vendor secretly gave 20% extra fries to anyone who ordered in Telugu today and honestly? Respect the culture hustle.",
    category: 'Campus Buzz',
    authorTag: "CSE '26 • Anonymous",
    college: 'KITSW',
    timeAgo: '12m ago',
    upvotes: 218,
    commentsCount: 34,
    reactions: { fire: 184, skull: 45, tea: 92, cap: 4 }
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
    reactions: { fire: 290, skull: 120, tea: 140, cap: 22 }
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
    reactions: { fire: 450, skull: 320, tea: 190, cap: 2 }
  }
];

let dailyPoll = {
  id: 'poll-01',
  question: "What is the single most overrated thing about college life right now?",
  context: "1,848 verified students from KITSW & Warangal colleges have voted.",
  totalVotes: 1848,
  options: [
    { id: 'opt-1', label: 'The 75% Mandatory Attendance Trap', votes: 842, breakdown: { CSE: 48, ECE: 44, MECH: 54, CIVIL: 42 } },
    { id: 'opt-2', label: 'Overhyped Annual College Fests', votes: 410, breakdown: { CSE: 22, ECE: 28, MECH: 18, CIVIL: 24 } },
    { id: 'opt-3', label: 'Placement Season Hype & Fearmongering', votes: 395, breakdown: { CSE: 24, ECE: 18, MECH: 19, CIVIL: 22 } },
    { id: 'opt-4', label: 'Four-person "Group" Projects (where 1 works)', votes: 201, breakdown: { CSE: 6, ECE: 10, MECH: 9, CIVIL: 12 } }
  ]
};

let mysteryEpisode = {
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
    }
  ],
  theories: [
    {
      id: 'th-1',
      author: 'Backbenchers Squad',
      branch: 'CSE',
      theory: 'The transmission is an ARG puzzle announcing the secret midnight hackathon.',
      upvotes: 89,
      timeAgo: '1h ago'
    }
  ]
};

// Pulse Feed
router.get('/pulse', (req, res) => {
  res.json({ success: true, posts: pulsePosts });
});

router.post('/pulse', (req, res) => {
  const { content, category, authorTag, college } = req.body;
  if (!content) return res.status(400).json({ error: 'Content is required' });

  const newPost = {
    id: `post-${Date.now()}`,
    content,
    category: category || 'Campus Buzz',
    authorTag: authorTag || "Student • Anonymous",
    college: college || 'KITSW',
    timeAgo: 'Just now',
    upvotes: 1,
    commentsCount: 0,
    reactions: { fire: 1, skull: 0, tea: 0, cap: 0 }
  };
  pulsePosts.unshift(newPost);
  res.json({ success: true, post: newPost });
});

// React to Pulse
router.post('/pulse/:id/react', (req, res) => {
  const { reaction } = req.body;
  const post = pulsePosts.find((p) => p.id === req.params.id);
  if (!post) return res.status(404).json({ error: 'Post not found' });

  if (post.reactions[reaction] !== undefined) {
    post.reactions[reaction] += 1;
    post.upvotes += 1;
  }
  res.json({ success: true, post });
});

// Polls
router.get('/poll', (req, res) => {
  res.json({ success: true, poll: dailyPoll });
});

router.post('/poll/vote', (req, res) => {
  const { optionId } = req.body;
  const opt = dailyPoll.options.find((o) => o.id === optionId);
  if (!opt) return res.status(404).json({ error: 'Option not found' });

  opt.votes += 1;
  dailyPoll.totalVotes += 1;
  res.json({ success: true, poll: dailyPoll });
});

// Mystery
router.get('/mystery', (req, res) => {
  res.json({ success: true, episode: mysteryEpisode });
});

router.post('/mystery/theory', (req, res) => {
  const { theory, author, branch } = req.body;
  if (!theory) return res.status(400).json({ error: 'Theory required' });

  const newTheory = {
    id: `th-${Date.now()}`,
    author: author || 'Anonymous Squad',
    branch: branch || 'CSE',
    theory,
    upvotes: 1,
    timeAgo: 'Just now'
  };
  mysteryEpisode.theories.unshift(newTheory);
  res.json({ success: true, theory: newTheory });
});

module.exports = router;

