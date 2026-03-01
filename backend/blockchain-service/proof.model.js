/**
 * Daily Proof Model
 * Stores blockchain proof records for territory state
 */
const mongoose = require('mongoose');

const dailyProofSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true,
    index: true
  },
  merkleRoot: {
    type: String,
    required: true,
    comment: 'Merkle root hash of all territory states'
  },
  auditHash: {
    type: String,
    required: true,
    comment: 'Hash of daily statistics for audit trail'
  },
  transactionHash: {
    type: String,
    required: true,
    unique: true,
    comment: 'Solana transaction signature'
  },
  territoryCount: {
    type: Number,
    required: true
  },
  playerCount: {
    type: Number,
    required: true
  },
  runCount: {
    type: Number,
    required: true,
    comment: 'Runs in the last 24 hours'
  },
  blockchainNetwork: {
    type: String,
    enum: ['solana-devnet', 'solana-mainnet'],
    default: 'solana-devnet'
  },
  status: {
    type: String,
    enum: ['PENDING', 'CONFIRMED', 'FAILED'],
    default: 'PENDING'
  },
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

// Index for fast lookup
dailyProofSchema.index({ date: -1 });
dailyProofSchema.index({ transactionHash: 1 });

const DailyProof = mongoose.models.DailyProof || mongoose.model('DailyProof', dailyProofSchema);

module.exports = { DailyProof };
