// blockchain-service/routes.js
const express  = require('express');
const { runDailyAnchor, verifyUserProof } = require('./anchor.sync');
const { requireAuth } = require('../middleware/auth');
const router   = express.Router();

// GET /blockchain/proof/:date
// Returns the stored proof + etherscan link
router.get('/proof/:date', async (req, res, next) => {
  try {
    const { DailyProof } = require('../config/models');
    const proof = await DailyProof.findOne({ date: req.params.date });
    if (!proof) return res.status(404).json({ error: 'No proof for this date' });
    res.json(proof);
  } catch (err) { next(err); }
});

// POST /blockchain/verify
// Lets a user verify their own score is in the on-chain proof
router.post('/verify', requireAuth, async (req, res, next) => {
  try {
    const { date, creditsEarned, hexesClaimed } = req.body;
    if (!date) return res.status(400).json({ error: 'date required (YYYY-MM-DD)' });
    const result = await verifyUserProof(req.userId, date, creditsEarned, hexesClaimed);
    res.json(result);
  } catch (err) { next(err); }
});

// POST /blockchain/anchor-now  (dev/admin only)
// Manually trigger an anchor — useful for testing without waiting for cron
router.post('/anchor-now', requireAuth, async (req, res, next) => {
  try {
    const { date } = req.body;
    const proof = await runDailyAnchor(date);
    res.json({ message: 'Anchor complete', proof });
  } catch (err) { next(err); }
});

module.exports = router;
