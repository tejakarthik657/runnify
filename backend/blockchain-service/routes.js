const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { User, DailyProof } = require('../core/schema');
const { writeDailyProof, fetchProofFromChain, initializeProofStore } = require('./anchor.sync');
const { generateUserProof, verifyUserProof } = require('./verify');

const router = express.Router();

async function requireAdmin(req, res, next) {
  try {
    if (!req.userId) return res.status(401).json({ error: 'Unauthorized' });
    const user = await User.findById(req.userId).select('isAdmin').lean();
    if (!user?.isAdmin) return res.status(403).json({ error: 'Admin access required' });
    return next();
  } catch (error) {
    return res.status(500).json({ error: 'Failed to validate admin access' });
  }
}

router.get('/proof/:date', async (req, res) => {
  try {
    const { date } = req.params;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: 'Use YYYY-MM-DD format' });
    }

    const dbProof = await DailyProof.findOne({ date });
    if (!dbProof) return res.status(404).json({ error: 'No proof for this date' });

    const chainProof = await fetchProofFromChain(date).catch(() => null);

    return res.json({
      date,
      status: dbProof.status,
      merkleRoot: dbProof.merkleRoot,
      txSignature: dbProof.txSignature,
      blockHeight: dbProof.blockHeight,
      network: dbProof.network,
      anchoredAt: dbProof.anchoredAt,
      totalUsers: dbProof.totalUsers,
      totalHexes: dbProof.totalHexesClaimed,
      explorerUrl: dbProof.txSignature
        ? `https://explorer.solana.com/tx/${dbProof.txSignature}?cluster=${dbProof.network}`
        : null,
      onChain: chainProof,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.get('/proofs', async (_req, res) => {
  try {
    const proofs = await DailyProof.find({ status: 'confirmed' })
      .sort({ date: -1 })
      .limit(30)
      .select('date merkleRoot txSignature anchoredAt totalUsers network');

    return res.json({ proofs });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.get('/my-proof/:date', requireAuth, async (req, res) => {
  try {
    const proofPackage = await generateUserProof(req.userId.toString(), req.params.date);
    const verified = verifyUserProof(proofPackage);

    return res.json({
      ...proofPackage,
      isVerified: verified,
      message: verified
        ? '✅ Your score is verified on-chain'
        : '❌ Verification failed — proof may not be anchored yet',
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.post('/trigger', requireAuth, requireAdmin, async (req, res) => {
  const dateStr = req.body?.date || new Date().toISOString().split('T')[0];
  res.json({ message: 'Proof generation started', date: dateStr });

  writeDailyProof(dateStr).catch((error) => {
    console.error('[Blockchain Trigger] Failed:', error.message);
  });
});

router.post('/initialize', requireAuth, requireAdmin, async (_req, res) => {
  try {
    const pda = await initializeProofStore();
    return res.json({ message: 'ProofStore initialized', pda });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

module.exports = router;
