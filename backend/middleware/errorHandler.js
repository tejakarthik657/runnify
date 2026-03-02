/**
 * Global Error Handler Middleware
 */
const logger = require('../utils/logger');
const multer = require('multer');

function errorHandler(err, req, res, next) {
  // Log the error
  logger.error('Error occurred:', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    user: req.user?.userId || 'unauthenticated'
  });
  
  // Default error
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal server error';
  
  // Multer file upload errors
  if (err instanceof multer.MulterError) {
    statusCode = 400;
    if (err.code === 'LIMIT_FILE_SIZE') {
      message = 'File size exceeds maximum limit (10MB)';
    } else if (err.code === 'LIMIT_FILE_COUNT') {
      message = 'Too many files uploaded';
    } else {
      message = `File upload error: ${err.message}`;
    }
  }
  
  // Mongoose validation error
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = Object.values(err.errors).map(e => e.message).join(', ');
  }
  
  // Mongoose duplicate key error
  if (err.code === 11000) {
    statusCode = 409;
    // Extract the field name from the error
    const field = Object.keys(err.keyPattern || {})[0];
    const value = err.keyValue?.[field];
    
    if (field === 'username') {
      message = `Username "${value}" is already taken. Please choose a different one.`;
    } else if (field === 'email') {
      message = `Email "${value}" is already registered. Please use a different email or login.`;
    } else {
      message = `${field} already exists in the system.`;
    }
  }
  
  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
  }
  
  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
  }
  
  // Send response
  res.status(statusCode).json({
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
}

module.exports = errorHandler;
