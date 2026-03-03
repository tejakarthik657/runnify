const express = require('express');
const { NotificationService } = require('../core/services');
const { authenticateJWT } = require('../middleware/auth');

const router = express.Router();

router.get('/me', authenticateJWT, async (req, res, next) => {
	try {
		const notifications = await NotificationService.getUnread(req.userId, 50);
		res.json({ notifications, unreadCount: notifications.length });
	} catch (error) {
		next(error);
	}
});

router.patch('/read-all', authenticateJWT, async (req, res, next) => {
	try {
		const notifications = await NotificationService.getUnread(req.userId, 1000);
		const ids = notifications.map((item) => item._id);
		if (ids.length > 0) {
			await NotificationService.markRead(req.userId, ids);
		}
		res.json({ message: 'All notifications marked as read' });
	} catch (error) {
		next(error);
	}
});

router.patch('/:id/read', authenticateJWT, async (req, res, next) => {
	try {
		await NotificationService.markRead(req.userId, [req.params.id]);
		res.json({ message: 'Marked as read' });
	} catch (error) {
		next(error);
	}
});

module.exports = router;
