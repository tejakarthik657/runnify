/**
 * Authentication Middleware
 * Supports both JWT and Web3 wallet authentication
 */
const jwt = require('jsonwebtoken');
const { ethers } = require('ethers');
const logger = require('../utils/logger');

const JWT_SECRET = process.env.JWT_SECRET;

/**
 * Standard JWT authentication
 */
function authenticateJWT(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    req.userId = decoded.userId || decoded.sub;
    req.username = decoded.username;
    req.userColor = decoded.color;
    req.avatarUrl = decoded.avatarUrl;
    next();
  } catch (error) {
    logger.warn('JWT verification failed:', error.message);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/**
 * Web3 wallet signature authentication
 * Used for blockchain-connected features
 */
function authenticateWallet(req, res, next) {
  const { address, message, signature } = req.body;

  if (!address || !message || !signature) {
    return res.status(400).json({
      error: 'Missing required fields: address, message, signature'
    });
  }

  try {
    // Verify the signature
    const recoveredAddress = ethers.verifyMessage(message, signature);

    if (recoveredAddress.toLowerCase() !== address.toLowerCase()) {
      return res.status(401).json({ error: 'Invalid signature' });
    }

    // Check message timestamp (prevent replay attacks)
    const messageData = JSON.parse(message);
    const timestamp = new Date(messageData.timestamp).getTime();
    const now = Date.now();
    const fiveMinutes = 5 * 60 * 1000;

    if (now - timestamp > fiveMinutes) {
      return res.status(401).json({ error: 'Signature expired' });
    }

    // Attach wallet info to request
    req.wallet = {
      address: recoveredAddress,
      verified: true
    };

    next();
  } catch (error) {
    logger.warn('Wallet authentication failed:', error.message);
    return res.status(401).json({ error: 'Signature verification failed' });
  }
}

/**
 * Optional authentication (doesn't fail if no token)
 */
function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    try {
      req.user = jwt.verify(token, JWT_SECRET);
    } catch (error) {
      // Silent fail - user remains unauthenticated
      logger.debug('Optional auth token invalid');
    }
  }

  next();
}

/**
 * Helper to generate JWT token
 */
function generateToken(userId, email, options = {}) {
  const payload = {
    userId,
    email,
    username: options.username,
    color: options.color,
    avatarUrl: options.avatarUrl,
    campus: options.campus,
    branch: options.branch,
    year: options.year,
    iat: Math.floor(Date.now() / 1000)
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: options.expiresIn || '7d'
  });
}

/**
 * Helper to generate refresh token
 */
function generateRefreshToken(userId) {
  const payload = {
    userId,
    type: 'refresh',
    jti: require('crypto').randomBytes(16).toString('hex') // Unique ID for each token
  };
  const secret = process.env.JWT_REFRESH_SECRET || JWT_SECRET;

  return jwt.sign(payload, secret, {
    expiresIn: '30d'
  });
}

module.exports = {
  authenticateJWT,
  requireAuth: authenticateJWT,
  authenticateWallet,
  optionalAuth,
  generateToken,
  generateRefreshToken
};
