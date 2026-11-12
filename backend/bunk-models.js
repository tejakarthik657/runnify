const mongoose = require('mongoose');

const { Schema } = mongoose;

const BunkPostSchema = new Schema(
  {
    campus: { type: String, required: true, trim: true, maxlength: 120, index: true },
    authorId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    content: { type: String, required: true, trim: true, maxlength: 1000 },
    topic: { type: String, required: true, trim: true, maxlength: 40 },
    isShadow: { type: Boolean, default: false },
    reactions: {
      fire: { type: Number, default: 0 },
      skull: { type: Number, default: 0 },
      tea: { type: Number, default: 0 },
      cap: { type: Number, default: 0 },
    },
    commentsCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

BunkPostSchema.index({ campus: 1, createdAt: -1 });

const BunkReactionSchema = new Schema(
  {
    postId: { type: Schema.Types.ObjectId, ref: 'BunkPost', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    reaction: { type: String, enum: ['fire', 'skull', 'tea', 'cap'], required: true },
  },
  { timestamps: true }
);

BunkReactionSchema.index({ postId: 1, userId: 1 }, { unique: true });

const BunkPollSchema = new Schema(
  {
    campus: { type: String, required: true, trim: true, index: true },
    question: { type: String, required: true, trim: true, maxlength: 240 },
    options: [{
      label: { type: String, required: true, trim: true, maxlength: 120 },
      votes: { type: Number, default: 0 },
    }],
    closesAt: { type: Date, required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

BunkPollSchema.index({ campus: 1, closesAt: -1 });

const BunkVoteSchema = new Schema(
  {
    pollId: { type: Schema.Types.ObjectId, ref: 'BunkPoll', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    optionId: { type: Schema.Types.ObjectId, required: true },
  },
  { timestamps: true }
);

BunkVoteSchema.index({ pollId: 1, userId: 1 }, { unique: true });

const BunkRoomSchema = new Schema(
  {
    campus: { type: String, required: true, trim: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 140 },
    topic: { type: String, required: true, trim: true, maxlength: 240 },
    hostId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    tags: { type: [String], default: [] },
    isLive: { type: Boolean, default: true },
    listenersCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

BunkRoomSchema.index({ campus: 1, isLive: 1, createdAt: -1 });

const model = (name, schema) => mongoose.models[name] || mongoose.model(name, schema);

module.exports = {
  BunkPost: model('BunkPost', BunkPostSchema),
  BunkReaction: model('BunkReaction', BunkReactionSchema),
  BunkPoll: model('BunkPoll', BunkPollSchema),
  BunkVote: model('BunkVote', BunkVoteSchema),
  BunkRoom: model('BunkRoom', BunkRoomSchema),
};
