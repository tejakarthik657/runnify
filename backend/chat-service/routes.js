const express = require('express');
const { authenticateJWT } = require('../middleware/auth');
const { ChatService } = require('../core/services');

const router = express.Router();

router.get('/rooms/:roomId/messages', authenticateJWT, async (req, res, next) => {
	try {
		const limit = Number(req.query.limit || 50);
		const before = req.query.before || null;
		const messages = await ChatService.getMessages(req.params.roomId, limit, before);
		res.json({ messages });
	} catch (error) {
		next(error);
	}
});

router.post('/rooms/:roomId/messages', authenticateJWT, async (req, res, next) => {
	try {
		const message = await ChatService.sendMessage({
			roomId: req.params.roomId,
			senderId: req.user.userId,
			content: req.body.content,
			contentType: req.body.contentType || 'text',
			replyToId: req.body.replyToId || null,
		});
		res.status(201).json({ message });
	} catch (error) {
		next(error);
	}
});

module.exports = router;
