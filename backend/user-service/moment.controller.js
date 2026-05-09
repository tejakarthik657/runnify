// user-service/moment.controller.js
// ============================================================
// RUN MOMENTS — Ephemeral 24h social posts
// ============================================================
const { RunMoment, User, Run } = require('../config/models');
const { uploadToSupabaseStorage } = require('./storage.upload');
const mongoose = require('mongoose');

/**
 * POST /user/me/moments
 * Create a new ephemeral run moment
 * Content-Type: multipart/form-data
 * Fields: file (image), caption (optional), runId (optional)
 */
async function createMoment(req, res, next) {
    try {
        const userId = req.userId;
        const { caption, runId } = req.body;
        const file = req.file;

        console.log('[Moment] Request body:', req.body);
        console.log('[Moment] File present:', !!file);
        console.log('[Moment] File details:', file ? { mimetype: file.mimetype, size: file.size } : 'No file');

        if (!file) return res.status(400).json({ error: 'Image file required' });

        if (typeof caption === 'string' && caption.length > 100) {
            return res.status(400).json({ error: 'Caption cannot exceed 100 characters' });
        }

        // ── Rate Limit: One moment per 24 hours ──────────────────
        const lastMoment = await RunMoment.findOne({ userId })
            .sort({ createdAt: -1 })
            .lean();

        if (lastMoment) {
            const hoursSinceLast = (Date.now() - new Date(lastMoment.createdAt).getTime()) / (1000 * 60 * 60);
            if (hoursSinceLast < 24) {
                return res.status(429).json({
                    error: 'Rate limit: One moment per 24 hours.',
                    retryInHours: Math.ceil(24 - hoursSinceLast)
                });
            }
        }

        // ── Fetch user info for the moment ───────────────────────
        const user = await User.findById(userId).select('username color hashcode city avatarUrl').lean();
        if (!user) return res.status(404).json({ error: 'User not found' });

        // ── Optional: Fetch run stats if runId provided ──────────
        let stats = undefined;
        if (runId) {
            if (mongoose.Types.ObjectId.isValid(runId)) {
                const run = await Run.findById(runId).select('distanceKm hexCount').lean();
                if (run) {
                    stats = {
                        distanceKm: run.distanceKm,
                        hexCount: run.hexCount,
                    };
                }
            } else {
                console.warn('[Moment] Ignoring invalid runId:', runId);
            }
        }

        // ── Create the moment ─────────────────────────────────────
        const now = new Date();
        const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours from now

        // Upload image to Supabase Storage
        let imageUrl;
        try {
            imageUrl = await uploadToSupabaseStorage(file.buffer, file.mimetype, 'moments');
        } catch (uploadError) {
            // Fallback keeps feature working if storage service is temporarily unavailable.
            imageUrl = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
            console.warn('[Moment] Supabase upload failed, using data URL fallback:', uploadError.message);
        }

        const moment = await RunMoment.create({
            userId,
            username: user.username,
            userColor: user.color,
            userHashcode: user.hashcode,
            userAvatarUrl: user.avatarUrl,
            city: user.city,
            imageUrl,
            caption,
            runId: mongoose.Types.ObjectId.isValid(runId) ? runId : undefined,
            stats,
            createdAt: now,
            expiresAt,
        });

        res.status(201).json({
            message: 'Moment shared successfully',
            moment: {
                _id: moment._id,
                expiresAt: moment.expiresAt
            }
        });
    } catch (err) {
        next(err);
    }
}

/**
 * GET /user/moments
 * List all active moments for the user's city or global
 */
async function getMoments(req, res, next) {
    try {
        const { city } = req.query;
        const now = new Date();

        const query = { expiresAt: { $gt: now } };
        if (city) query.city = city;

        const moments = await RunMoment.find(query)
            .sort({ createdAt: -1 })
            .limit(50)
            .lean();

        res.json({ count: moments.length, moments });
    } catch (err) {
        next(err);
    }
}

module.exports = {
    createMoment,
    getMoments,
};
