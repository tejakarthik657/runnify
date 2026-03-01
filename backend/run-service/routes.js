const express = require('express');
const { authenticateJWT } = require('../middleware/auth');
const { gpsRateLimit } = require('../middleware/rateLimit');
const { RunService } = require('../core/services');

const router = express.Router();

router.post('/start', authenticateJWT, async (req, res, next) => {
	try {
		const { lat, lng, city } = req.body;
		const run = await RunService.startRun(req.user.userId, { lat, lng, city });
		res.status(201).json({ run });
	} catch (error) {
		next(error);
	}
});

router.post('/:runId/gps', authenticateJWT, gpsRateLimit, async (req, res, next) => {
	try {
		const result = await RunService.ingestGpsPoints(req.params.runId, req.user.userId, req.body.points || []);
		res.json(result);
	} catch (error) {
		next(error);
	}
});

router.post('/:runId/end', authenticateJWT, async (req, res, next) => {
	try {
		const { lat, lng } = req.body;
		const result = await RunService.endRun(req.params.runId, req.user.userId, { lat, lng });
		res.json(result);
	} catch (error) {
		next(error);
	}
});

module.exports = router;
