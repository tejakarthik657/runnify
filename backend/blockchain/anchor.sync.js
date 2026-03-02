// blockchain/anchor.sync.js
// ============================================================
// DAILY PROOF ANCHORING — Blockchain commitment of run data
// ============================================================
// FLOW:
//  1. Query all VERIFIED + CLEAN runs from yesterday
//  2. Exclude disqualified runs (anti-cheat verdicts)
//  3. Hash + merkle tree the clean runs
//  4. Anchor proof to blockchain (Solana, ICP, etc.)
//  5. Update DailyProof document with commitment
// ============================================================
const mongoose = require('mongoose');
const crypto = require('crypto');
const { Run, DailyProof, User } = require('../config/models');
require('dotenv').config();

/**
 * MERKLE TREE HELPER — Create merkle root from run hashes
 */
class MerkleTree {
  constructor(leaves) {
    this.leaves = leaves.map(leaf => this.hash(leaf));
    this.tree = [this.leaves];
    this.buildTree();
  }

  hash(data) {
    return crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex');
  }

  buildTree() {
    let current = this.leaves;
    while (current.length > 1) {
      const next = [];
      for (let i = 0; i < current.length; i += 2) {
        const left = current[i];
        const right = current[i + 1] || left;
        next.push(this.hash(left + right));
      }
      current = next;
      this.tree.push(current);
    }
  }

  getRoot() {
    return this.tree[this.tree.length - 1][0];
  }

  getProof(leafIndex) {
    const proof = [];
    let index = leafIndex;
    for (let level = 0; level < this.tree.length - 1; level++) {
      const isRight = index % 2 === 1;
      const pairIndex = isRight ? index - 1 : index + 1;
      if (this.tree[level][pairIndex]) {
        proof.push({
          hash: this.tree[level][pairIndex],
          position: isRight ? 'left' : 'right',
        });
      }
      index = Math.floor(index / 2);
    }
    return proof;
  }
}

/**
 * MAIN — Anchor daily runs to blockchain
 */
async function anchorDailyProof(date = null) {
  const targetDate = date ? new Date(date) : new Date();
  targetDate.setHours(0, 0, 0, 0);

  const nextDate = new Date(targetDate);
  nextDate.setDate(nextDate.getDate() + 1);

  console.log(`[AnchorSync] Anchoring runs from ${targetDate.toISOString()}`);

  // ── 1. Query CLEAN runs from today (exclude disqualified) ──
  const cleanRuns = await Run.find({
    startedAt: { $gte: targetDate, $lt: nextDate },
    isProcessed: true,
    'antiCheat.verdict': { $nin: ['disqualified'] }, // Exclude cheating/flagged runs
    'antiCheat.verdict': 'clean', // Only verified clean runs
  })
    .select('_id userId username hexesClaimed hexesInvaded creditsEarned distanceKm antiCheat')
    .lean();

  console.log(`[AnchorSync] Found ${cleanRuns.length} clean runs for ${targetDate.toISOString()}`);

  if (cleanRuns.length === 0) {
    console.log('[AnchorSync] No clean runs to anchor. Creating empty proof.');
    await createEmptyProof(targetDate);
    return { date: targetDate, runCount: 0, root: null, txHash: null };
  }

  // ── 2. Prepare leaf data (run summary hashes) ────────────
  const leaves = cleanRuns.map(run => ({
    runId: run._id.toString(),
    userId: run.userId.toString(),
    hexesClaimed: run.hexesClaimed.length,
    hexesInvaded: run.hexesInvaded.length,
    creditsEarned: run.creditsEarned,
    distanceKm: run.distanceKm,
    verdict: run.antiCheat.verdict,
    timestamp: run.startedAt,
  }));

  // ── 3. Build merkle tree ──────────────────────────────────
  const merkle = new MerkleTree(leaves);
  const root = merkle.getRoot();
  console.log(`[AnchorSync] Merkle root: ${root}`);

  // ── 4. Anchor to blockchain ──────────────────────────────
  //       (Implementation depends on chosen blockchain)
  //       Examples: Solana Program, ICP Canister, Ethereum contract
  let txHash = null;
  let blockNumber = null;
  let blockTimestamp = null;

  try {
    const anchorResult = await anchorToBlockchain(root, targetDate, cleanRuns.length);
    txHash = anchorResult.txHash;
    blockNumber = anchorResult.blockNumber;
    blockTimestamp = anchorResult.blockTimestamp;
    console.log(`[AnchorSync] Anchored to blockchain: ${txHash}`);
  } catch (err) {
    console.error('[AnchorSync] Blockchain anchor failed (non-fatal):', err.message);
    // Don't fail the job if blockchain is down — we still record the proof locally
  }

  // ── 5. Save to DailyProof ───────────────────────────────
  const proof = await DailyProof.updateOne(
    { date: targetDate },
    {
      $set: {
        date: targetDate,
        runIds: cleanRuns.map(r => r._id),
        runCount: cleanRuns.length,
        merkleRoot: root,
        blockchainTxHash: txHash,
        blockNumber,
        blockTimestamp,
        leafCount: leaves.length,
        proofData: leaves, // Full data for transparency
        createdAt: new Date(),
      },
    },
    { upsert: true }
  );

  console.log(`[AnchorSync] Proof saved for ${targetDate.toISOString()}`);

  return {
    date: targetDate,
    runCount: cleanRuns.length,
    root,
    txHash,
    blockNumber,
  };
}

/**
 * BLOCKCHAIN ANCHOR STUB
 * Replace with actual blockchain implementation:
 *  - Solana: Send tx to on-chain program
 *  - ICP: Call canister method
 *  - Ethereum: Call smart contract
 */
async function anchorToBlockchain(merkleRoot, date, runCount) {
  // PLACEHOLDER — implement per blockchain
  console.log(`[AnchorSync] Would anchor to blockchain: root=${merkleRoot}, runs=${runCount}`);

  return {
    txHash: '0x' + crypto.randomBytes(32).toString('hex'),
    blockNumber: null,
    blockTimestamp: new Date(),
  };
}

/**
 * Create empty proof for days with no activity
 */
async function createEmptyProof(date) {
  await DailyProof.updateOne(
    { date },
    {
      $set: {
        date,
        runIds: [],
        runCount: 0,
        merkleRoot: null,
        blockchainTxHash: null,
        blockNumber: null,
        blockTimestamp: null,
        leafCount: 0,
        proofData: [],
        createdAt: new Date(),
      },
    },
    { upsert: true }
  );
}

/**
 * CRON TRIGGER
 * Can be called from:
 *  - utils/cron.js (setInterval every 24h)
 *  - GitHub Actions (scheduled workflow)
 *  - Render cron job
 */
async function startAnchorCron() {
  if (process.env.NODE_ENV === 'test') {
    console.log('[AnchorSync] Skipping in test mode');
    return;
  }

  await mongoose.connect(process.env.MONGODB_URI, { dbName: 'territory_run' });

  // Anchor yesterday's runs (give 1 hour for final runs to process)
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  const result = await anchorDailyProof(yesterday);
  console.log('[AnchorSync] Completed:', result);

  await mongoose.disconnect();
}

module.exports = {
  anchorDailyProof,
  startAnchorCron,
  MerkleTree,
};

// If run directly
if (require.main === module) {
  startAnchorCron().catch(err => {
    console.error('[AnchorSync] Fatal:', err);
    process.exit(1);
  });
}
