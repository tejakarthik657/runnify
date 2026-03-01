/**
 * Chat Service with AI Bot Integration
 * Handles WebSocket connections and integrates RAG bot
 */
const logger = require('../utils/logger');
const axios = require('axios');

const RAG_BOT_URL = process.env.RAG_BOT_URL || 'http://localhost:8000';

/**
 * Initialize Socket.IO for chat
 */
function initializeChatSocket(io) {
  io.on('connection', (socket) => {
    logger.info(`User connected: ${socket.id}`);
    
    // Join room (global, city, or DM)
    socket.on('join-room', (room) => {
      socket.join(room);
      logger.info(`User ${socket.id} joined room: ${room}`);
    });
    
    // Leave room
    socket.on('leave-room', (room) => {
      socket.leave(room);
      logger.info(`User ${socket.id} left room: ${room}`);
    });
    
    // Send message
    socket.on('send-message', async (data) => {
      const { room, message, userId, username, userColor } = data;
      
      const messageData = {
        id: Date.now().toString(),
        userId,
        username,
        userColor,
        message,
        timestamp: new Date(),
        type: 'user'
      };
      
      // Broadcast to room
      io.to(room).emit('new-message', messageData);
      
      // Check if message is a question for the bot (starts with @bot or ?)
      if (message.startsWith('@bot') || message.startsWith('?')) {
        const question = message.replace(/^(@bot|\\?)/i, '').trim();
        
        if (question) {
          // Query RAG bot
          try {
            const botResponse = await queryRagBot(question, userId);
            
            const botMessage = {
              id: Date.now().toString() + '_bot',
              userId: 'bot',
              username: 'Territory Bot',
              userColor: '#6366f1', // Indigo
              message: botResponse.answer,
              timestamp: new Date(),
              type: 'bot',
              sources: botResponse.sources
            };
            
            io.to(room).emit('new-message', botMessage);
          } catch (error) {
            logger.error('Bot query failed:', error);
            
            const errorMessage = {
              id: Date.now().toString() + '_bot_error',
              userId: 'bot',
              username: 'Territory Bot',
              userColor: '#6366f1',
              message: "Sorry, I'm having trouble right now. Please try again later.",
              timestamp: new Date(),
              type: 'bot'
            };
            
            io.to(room).emit('new-message', errorMessage);
          }
        }
      }
    });
    
    // Typing indicator
    socket.on('typing', (data) => {
      const { room, username } = data;
      socket.to(room).emit('user-typing', { username });
    });
    
    // Stop typing
    socket.on('stop-typing', (data) => {
      const { room, username } = data;
      socket.to(room).emit('user-stop-typing', { username });
    });
    
    // Disconnect
    socket.on('disconnect', () => {
      logger.info(`User disconnected: ${socket.id}`);
    });
  });
  
  logger.info('✅ Chat Socket.IO initialized');
}

/**
 * Query RAG bot service
 */
async function queryRagBot(question, userAddress) {
  try {
    const response = await axios.post(`${RAG_BOT_URL}/query`, {
      question,
      user_address: userAddress
    }, {
      timeout: 10000
    });
    
    return response.data;
  } catch (error) {
    logger.error('RAG bot query failed:', error.message);
    throw error;
  }
}

module.exports = {
  initializeChatSocket,
  queryRagBot
};
