/**
 * Daily Blockchain Proof Cron Job
 * Runs at 00:00 UTC to commit daily territory proofs to Solana
 */
const cron = require('node-cron');
const { generateDailyProof } = require('./anchor.sync');
const logger = require('../utils/logger');

/**
 * Schedule daily proof generation
 * Runs at midnight UTC every day
 */
function startDailyCron() {
  // Run at 00:00 UTC every day
  cron.schedule('0 0 * * *', async () => {
    logger.info('🕐 Starting daily blockchain proof generation...');
    
    try {
      const result = await generateDailyProof();
      logger.info('✅ Daily proof committed:', result);
    } catch (error) {
      logger.error('❌ Daily proof generation failed:', error);
      // Send alert/notification here
    }
  }, {
    timezone: 'UTC'
  });
  
  logger.info('📅 Daily blockchain cron job initialized (00:00 UTC)');
}

/**
 * Manual trigger for testing
 */
async function triggerManually() {
  logger.info('🔧 Manual proof generation triggered');
  return await generateDailyProof();
}

module.exports = {
  startDailyCron,
  triggerManually
};
