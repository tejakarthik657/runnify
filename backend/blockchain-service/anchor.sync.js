// blockchain-service/anchor.sync.js
// Territory Run — Daily Proof on Ethereum Sepolia
// Cost: $0 (testnet). Anchor = 0 ETH tx with merkle root as calldata.
const { ethers }  = require('ethers');
const crypto      = require('crypto');
const { Run, DailyProof } = require('../config/models');

// ── Provider + wallet ─────────────────────────────────────
function getWallet() {
  const provider = new ethers.JsonRpcProvider(process.env.ALCHEMY_RPC_URL);
  const wallet   = new ethers.Wallet(process.env.WALLET_PRIVATE_KEY, provider);
  return { provider, wallet };
}

// ── Merkle helpers ────────────────────────────────────────
const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');

function buildMerkleRoot(leaves) {
  if (!leaves.length)  return sha256('empty');
  if (leaves.length === 1) return leaves[0];
  const next = [];
  for (let i = 0; i < leaves.length; i += 2) {
    const l = leaves[i];
    const r = leaves[i + 1] || l;
    next.push(sha256(l + r));
  }
  return buildMerkleRoot(next);
}

// ── Main anchor ───────────────────────────────────────────
async function runDailyAnchor(dateStr) {
  const date = dateStr || new Date().toISOString().slice(0, 10);

  // Skip if already anchored
  const existing = await DailyProof.findOne({ date });
  if (existing?.txHash) {
    console.log(`[Blockchain] Already anchored for ${date}`);
    return existing;
  }

  // Aggregate clean runs only
  const start = new Date(`${date}T00:00:00.000Z`);
  const end   = new Date(`${date}T23:59:59.999Z`);

  const stats = await Run.aggregate([
    { $match: {
        status:  'ended',
        endedAt: { $gte: start, $lte: end },
        'antiCheat.verdict': { $ne: 'disqualified' },
    }},
    { $group: {
        _id:           '$userId',
        creditsEarned: { $sum: '$creditsEarned' },
        hexesClaimed:  { $sum: { $size: { $ifNull: ['$hexesClaimed', []] } } },
    }},
  ]);

  if (!stats.length) {
    console.log(`[Blockchain] No valid runs for ${date}`);
    return null;
  }

  // Build Merkle root
  const leaves = stats.map(s =>
    sha256(`${s._id}:${date}:${s.creditsEarned}:${s.hexesClaimed}`)
  );
  const merkleRoot  = buildMerkleRoot(leaves);
  const totalHexes  = stats.reduce((s, u) => s + u.hexesClaimed, 0);

  // Send 0 ETH tx with merkle root in calldata
  let txHash = null;
  try {
    const { wallet } = getWallet();
    const memo = `TERRITORY_RUN:${date}:${merkleRoot}:users=${stats.length}:hexes=${totalHexes}`;
    const tx   = await wallet.sendTransaction({
      to:       wallet.address,
      value:    0n,
      data:     '0x' + Buffer.from(memo, 'utf8').toString('hex'),
      gasLimit: 50000n,
    });
    const receipt = await tx.wait(1);
    txHash = receipt.status === 1 ? tx.hash : null;
    console.log(`[Blockchain] Anchored: ${txHash}`);
  } catch (err) {
    console.error(`[Blockchain] TX failed, saving locally:`, err.message);
  }

  // Save to MongoDB regardless of TX success
  return await DailyProof.findOneAndUpdate(
    { date },
    { $set: {
        date, merkleRoot,
        txHash,
        txStatus:      txHash ? 'confirmed' : 'failed',
        userCount:     stats.length,
        totalHexes,
        anchoredAt:    new Date(),
        network:       'sepolia',
        explorerUrl:   txHash ? `https://sepolia.etherscan.io/tx/${txHash}` : null,
    }},
    { upsert: true, new: true }
  );
}

// ── Verify a user's score against on-chain proof ─────────
async function verifyUserProof(userId, date, creditsEarned, hexesClaimed) {
  const proof = await DailyProof.findOne({ date });
  if (!proof) return { valid: false, reason: 'No proof found for this date' };

  // Rebuild the leaf for this user
  const leaf = sha256(`${userId}:${date}:${creditsEarned}:${hexesClaimed}`);

  // Rebuild entire tree from DB and check leaf is in it
  const start = new Date(`${date}T00:00:00.000Z`);
  const end   = new Date(`${date}T23:59:59.999Z`);

  const stats = await Run.aggregate([
    { $match: {
        status: 'ended', endedAt: { $gte: start, $lte: end },
        'antiCheat.verdict': { $ne: 'disqualified' },
    }},
    { $group: {
        _id: '$userId',
        creditsEarned: { $sum: '$creditsEarned' },
        hexesClaimed:  { $sum: { $size: { $ifNull: ['$hexesClaimed', []] } } },
    }},
  ]);

  const leaves       = stats.map(s => sha256(`${s._id}:${date}:${s.creditsEarned}:${s.hexesClaimed}`));
  const rebuiltRoot  = buildMerkleRoot(leaves);
  const leafInTree   = leaves.includes(leaf);
  const rootMatches  = rebuiltRoot === proof.merkleRoot;

  return {
    valid:       leafInTree && rootMatches,
    leafInTree,
    rootMatches,
    merkleRoot:  proof.merkleRoot,
    txHash:      proof.txHash,
    explorerUrl: proof.explorerUrl,
    network:     'sepolia',
  };
}

module.exports = { runDailyAnchor, verifyUserProof };
