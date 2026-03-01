const express = require('express');
const { authenticateJWT } = require('../middleware/auth');
const { getProfile, searchUsers } = require('./profile.controller');

const router = express.Router();

router.get('/search', authenticateJWT, searchUsers);
router.get('/:id', authenticateJWT, getProfile);

module.exports = router;
