const express = require('express');
const { authenticateJWT } = require('./middleware/auth');
const { User } = require('./core/schema');
const {
  BunkPost,
  BunkPoll,
  BunkReaction,
  BunkRoom,
  BunkVote,
} = require('./bunk-models');

const router = express.Router();
const REACTIONS = ['fire', 'skull', 'tea', 'cap'];

function getCampus(req) {
  const campus = typeof req.query.campus === 'string' ? req.query.campus.trim() : '';
  return campus || req.user?.campus || req.user?.city || '';
}

function relativeTime(date) {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / 1000));
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function serializePost(post, userReaction = null) {
  return {
    id: post._id.toString(),
    content: post.content,
    topic: post.topic,
    authorTag: post.isShadow ? 'Shadow student' : `${post.authorId?.username || 'Verified student'} · ${post.authorId?.branch || 'Student'}`,
    isShadow: post.isShadow,
    college: post.campus,
    timeAgo: relativeTime(post.createdAt),
    reactions: post.reactions,
    userReaction,
    commentsCount: post.commentsCount,
  };
}

function serializePoll(poll, vote) {
  const totalVotes = poll.options.reduce((total, option) => total + option.votes, 0);
  return {
    id: poll._id.toString(),
    label: `CAMPUS PULSE · CLOSES ${new Date(poll.closesAt).toLocaleString()}`,
    closesIn: new Date(poll.closesAt).toISOString(),
    question: poll.question,
    totalVotes,
    cohortCount: totalVotes,
    userVotedId: vote?.optionId?.toString() || null,
    options: poll.options.map((option) => ({
      id: option._id.toString(),
      text: option.label,
      votes: option.votes,
      pctOverall: totalVotes ? Math.round((option.votes / totalVotes) * 100) : 0,
      pctBranch: 0,
      pctYear: 0,
      pctAllIndia: 0,
    })),
    comments: [],
  };
}

router.use(authenticateJWT);

router.patch('/profile', async (req, res, next) => {
  try {
    const updates = {};
    if (typeof req.body.name === 'string') updates.username = req.body.name.trim();
    if (Array.isArray(req.body.interests)) updates.interests = req.body.interests.map(String).slice(0, 20);
    const user = await User.findByIdAndUpdate(req.userId, { $set: updates }, { new: true }).select('username city campus branch year interests');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
  } catch (error) {
    next(error);
  }
});

router.get('/bootstrap', async (req, res, next) => {
  try {
    const campus = getCampus(req);
    if (!campus) return res.status(400).json({ error: 'Set a campus before loading Bunk' });

    const [user, posts, poll, rooms] = await Promise.all([
      User.findById(req.userId).select('username email city campus branch year bio avatarUrl interests'),
      BunkPost.find({ campus }).populate('authorId', 'username branch').sort({ createdAt: -1 }).limit(50),
      BunkPoll.findOne({ campus, closesAt: { $gt: new Date() } }).sort({ createdAt: -1 }),
      BunkRoom.find({ campus, isLive: true }).populate('hostId', 'username').sort({ createdAt: -1 }).limit(20),
    ]);

    const reactions = posts.length
      ? await BunkReaction.find({ userId: req.userId, postId: { $in: posts.map((post) => post._id) } }).select('postId reaction')
      : [];
    const reactionByPost = new Map(reactions.map((reaction) => [reaction.postId.toString(), reaction.reaction]));
    const vote = poll ? await BunkVote.findOne({ pollId: poll._id, userId: req.userId }).select('optionId') : null;

    res.json({
      user,
      activeCampus: campus,
      availableCampuses: [campus],
      todayPulse: poll ? serializePoll(poll, vote) : null,
      discoverPosts: posts.map((post) => serializePost(post, reactionByPost.get(post._id.toString()) || null)),
      afterHoursRooms: rooms.map((room) => ({
        id: room._id.toString(),
        title: room.title,
        topic: room.topic,
        hostName: room.hostId?.username || 'Verified student',
        hostAvatar: room.hostId?.username?.slice(0, 1).toUpperCase() || '?',
        listenersCount: room.listenersCount,
        speakers: [],
        isLive: room.isLive,
        tags: room.tags,
        fistbumpsCount: 0,
        userFistbumped: false,
      })),
      campusClashes: [],
    });
  } catch (error) {
    next(error);
  }
});

router.get('/people', async (req, res, next) => {
  try {
    const campus = getCampus(req);
    const people = await User.find({
      _id: { $ne: req.userId },
      $or: [{ campus }, { city: campus }],
      isBanned: { $ne: true },
    }).select('username branch year interests bio avatarUrl').sort({ lastActiveAt: -1 }).limit(50);
    res.json({
      people: people.map((person) => ({
        id: person._id.toString(),
        name: person.username,
        branch: person.branch || 'Student',
        year: person.year || '',
        interests: person.interests || [],
        bio: person.bio || '',
        avatarUrl: person.avatarUrl || null,
      })),
    });
  } catch (error) {
    next(error);
  }
});

router.post('/pulse', async (req, res, next) => {
  try {
    const { content, topic, isShadow } = req.body;
    const campus = getCampus(req);
    if (!campus || typeof content !== 'string' || !content.trim()) {
      return res.status(400).json({ error: 'Campus and content are required' });
    }
    const post = await BunkPost.create({
      campus,
      authorId: req.userId,
      content: content.trim(),
      topic: typeof topic === 'string' && topic.trim() ? topic.trim() : '#CampusPulse',
      isShadow: Boolean(isShadow),
    });
    await post.populate('authorId', 'username branch');
    res.status(201).json({ post: serializePost(post) });
  } catch (error) {
    next(error);
  }
});

router.post('/pulse/:id/react', async (req, res, next) => {
  try {
    const { reaction } = req.body;
    if (!REACTIONS.includes(reaction)) return res.status(400).json({ error: 'Unsupported reaction' });
    const post = await BunkPost.findOne({ _id: req.params.id, campus: getCampus(req) }).populate('authorId', 'username branch');
    if (!post) return res.status(404).json({ error: 'Post not found' });

    const current = await BunkReaction.findOne({ postId: post._id, userId: req.userId });
    if (current?.reaction === reaction) {
      await BunkReaction.deleteOne({ _id: current._id });
      await BunkPost.updateOne({ _id: post._id }, { $inc: { [`reactions.${reaction}`]: -1 } });
    } else {
      if (current) {
        await BunkPost.updateOne({ _id: post._id }, { $inc: { [`reactions.${current.reaction}`]: -1 } });
        current.reaction = reaction;
        await current.save();
      } else {
        await BunkReaction.create({ postId: post._id, userId: req.userId, reaction });
      }
      await BunkPost.updateOne({ _id: post._id }, { $inc: { [`reactions.${reaction}`]: 1 } });
    }

    const updated = await BunkPost.findById(post._id).populate('authorId', 'username branch');
    res.json({ post: serializePost(updated, current?.reaction === reaction ? null : reaction) });
  } catch (error) {
    next(error);
  }
});

router.post('/poll', async (req, res, next) => {
  try {
    const { question, options, closesAt } = req.body;
    const campus = getCampus(req);
    if (!campus || typeof question !== 'string' || !Array.isArray(options) || options.length < 2) {
      return res.status(400).json({ error: 'Campus, question, and at least two options are required' });
    }
    const poll = await BunkPoll.create({
      campus,
      question: question.trim(),
      options: options.map((label) => ({ label: String(label).trim() })).filter((option) => option.label),
      closesAt: closesAt || new Date(Date.now() + 24 * 60 * 60 * 1000),
      createdBy: req.userId,
    });
    res.status(201).json({ poll: serializePoll(poll, null) });
  } catch (error) {
    next(error);
  }
});

router.post('/poll/vote', async (req, res, next) => {
  try {
    const { optionId } = req.body;
    const poll = await BunkPoll.findOne({ _id: req.body.pollId, campus: getCampus(req), closesAt: { $gt: new Date() } });
    if (!poll) return res.status(404).json({ error: 'Poll not found or closed' });
    const option = poll.options.id(optionId);
    if (!option) return res.status(400).json({ error: 'Option not found' });
    const existing = await BunkVote.findOne({ pollId: poll._id, userId: req.userId });
    if (existing) return res.status(409).json({ error: 'You have already voted in this pulse' });

    await BunkVote.create({ pollId: poll._id, userId: req.userId, optionId });
    option.votes += 1;
    await poll.save();
    res.json({ poll: serializePoll(poll, { optionId }) });
  } catch (error) {
    next(error);
  }
});

router.post('/rooms', async (req, res, next) => {
  try {
    const { title, topic, tags = [] } = req.body;
    const campus = getCampus(req);
    if (!campus || !title || !topic) return res.status(400).json({ error: 'Campus, title, and topic are required' });
    const room = await BunkRoom.create({ campus, title: title.trim(), topic: topic.trim(), tags, hostId: req.userId });
    res.status(201).json({ room });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
