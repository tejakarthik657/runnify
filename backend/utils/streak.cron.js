/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║          STREAK RETENTION CRON JOB                                   ║
 * ║          Runs every 4 hours                                          ║
 * ║          Notifies users at risk of losing their streak (>36h idle)   ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 */

const mongoose = require('mongoose');
const cron = require('node-cron');
require('dotenv').config();

const logger = require('./logger');
const { connectDB } = require('../config/db');
const { User, Notification } = require('../core/schema');
const { pushToUser } = require('../notification-service/push');

async function checkStreakRisks() {
    try {
        logger.info('🔥 Checking for streak risks...');

        // Users with a streak > 1 who haven't run in 36-48 hours
        const thirtySixHoursAgo = new Date(Date.now() - 36 * 60 * 60 * 1000);
        const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);

        const atRiskUsers = await User.find({
            'stats.currentStreak': { $gt: 1 },
            'stats.lastRunDate': { $lt: thirtySixHoursAgo, $gt: fortyEightHoursAgo },
            'notifications.streakReminders': true
        }).select('_id username stats.currentStreak');

        if (atRiskUsers.length === 0) {
            logger.info('✅ No users at immediate streak risk.');
            return;
        }

        logger.info(`🚨 Notifying ${atRiskUsers.length} users at risk of streak loss.`);

        const notifications = atRiskUsers.map(user => ({
            userId: user._id,
            type: 'streak_reminder',
            isRead: false,
            title: '🔥 STREAK AT RISK',
            body: `Commander ${user.username}, your ${user.stats.currentStreak}-day streak expires in less than 12 hours. Deploy now to maintain dominance!`,
            iconType: 'fire',
            actionType: 'open_map',
            schemaVersion: 'v1'
        }));

        await Notification.insertMany(notifications);

        // Also attempt live push if online
        atRiskUsers.forEach(user => {
            pushToUser(user._id.toString(), 'streak_reminder', {
                message: `Your ${user.stats.currentStreak}-day streak is about to expire!`,
                streak: user.stats.currentStreak
            });
        });

        logger.info(`✅ Streak reminders sent.`);
    } catch (error) {
        logger.error('❌ Streak risk check failed:', error);
    }
}

async function startStreakCron() {
    await connectDB();
    logger.info('🕐 Streak cron initialized (Every 4 hours)');

    // Schedule: Every 4 hours
    const job = cron.schedule('0 */4 * * *', async () => {
        await checkStreakRisks();
    });

    if (process.env.STREAK_CHECK_IMMEDIATE === 'true') {
        await checkStreakRisks();
    }

    return job;
}

if (require.main === module) {
    startStreakCron().then(() => {
        logger.info('🚀 Streak Retention Service running.');
    });
}

module.exports = { startStreakCron, checkStreakRisks };
