const express = require('express');
const { authRateLimit } = require('../middleware/rateLimit');
const { authenticateJWT } = require('../middleware/auth');
const { register, login, me } = require('./controller');

const router = express.Router();

router.post('/register', authRateLimit, register);
router.post('/login', authRateLimit, login);
router.get('/me', authenticateJWT, me);

module.exports = router;
