const cron = require('node-cron');
const { writeDailyProof } = require('./anchor.sync');
const DailyProof = require('./proof.model');
const logger = require('../utils/logger');

function registerBlockchainCrons() {
  cron.schedule('0 0 * * *', async () => {
    const dateStr = new Date().toISOString().split('T')[0];
    logger.info(`🕐 Midnight blockchain proof job started for ${dateStr}`);
    try {
      await writeDailyProof(dateStr);
    } catch (error) {
      logger.error(`❌ Midnight blockchain proof job failed: ${error.message}`);
    }
  }, {
    timezone: 'UTC',
  });

  cron.schedule('0 2 * * *', async () => {
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    const today = new Date().toISOString().split('T')[0];

    try {
      const failed = await DailyProof.find({
        date: { $in: [yesterday, today] },
        status: { $in: ['failed', 'anchoring'] },
        anchorAttempts: { $lt: 3 },
      });

      for (const proof of failed) {
        logger.warn(`🔁 Retrying blockchain proof for ${proof.date}`);
        await writeDailyProof(proof.date).catch((error) => {
          logger.error(`❌ Retry failed for ${proof.date}: ${error.message}`);
        });
      }
    } catch (error) {
      logger.error(`❌ Retry cron failed: ${error.message}`);
    }
  }, {
    timezone: 'UTC',
  });

  logger.info('✅ Blockchain crons registered (00:00 UTC + 02:00 UTC retry)');
}

async function triggerManually() {
  const dateStr = new Date().toISOString().split('T')[0];
  logger.info(`🔧 Manual blockchain proof trigger for ${dateStr}`);
  return writeDailyProof(dateStr);
}

module.exports = {
  registerBlockchainCrons,
  triggerManually,
};

if (require.main === module) {
  registerBlockchainCrons();
}
