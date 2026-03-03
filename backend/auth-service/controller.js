const bcrypt = require('bcryptjs');
const { User } = require('../core/schema');
const { UserService } = require('../core/services');
const { createAuthTokens } = require('./jwt');
const { storeRefreshToken } = require('../middleware/sessions');

function parseHomeLocation(input = {}) {
	const lat = Number(input.lat);
	const lng = Number(input.lng);
	const hasLocation = Number.isFinite(lat) && Number.isFinite(lng);

	if (!hasLocation) return null;

	return {
		lat,
		lng,
		city: typeof input.city === 'string' && input.city.trim() ? input.city.trim() : null,
	};
}

async function saveHomeLocation(user, reqBody = {}) {
	const homeLocation = parseHomeLocation(reqBody);
	if (!homeLocation) return null;

	await User.updateOne(
		{ _id: user._id },
		{
			$set: {
				'homeLocation.lat': homeLocation.lat,
				'homeLocation.lng': homeLocation.lng,
				'homeLocation.city': homeLocation.city || user.city || null,
				'homeLocation.updatedAt': new Date(),
			},
		}
	);

	return {
		lat: homeLocation.lat,
		lng: homeLocation.lng,
		city: homeLocation.city || user.city || null,
		updatedAt: new Date(),
	};
}

function buildAuthUserPayload(user, locationOverride = null) {
	return {
		...user.publicProfile,
		id: user._id,
		homeLocation: {
			lat: locationOverride?.lat ?? user.homeLocation?.lat ?? null,
			lng: locationOverride?.lng ?? user.homeLocation?.lng ?? null,
			city: locationOverride?.city ?? user.homeLocation?.city ?? user.city ?? null,
			updatedAt: locationOverride?.updatedAt ?? user.homeLocation?.updatedAt ?? null,
		},
	};
}

async function register(req, res, next) {
	try {
		console.log('[Registration] Body fields:', Object.keys(req.body || {}));
		console.log('[Registration] File present:', !!req.file);

		const { username, email, password, color, city } = req.body;

		if (!username || !email || !password) {
			return res.status(400).json({
				error: 'Missing required fields',
				received: { username: !!username, email: !!email, password: !!password }
			});
		}

		const passwordHash = password ? await bcrypt.hash(password, 10) : null;
		const user = await UserService.register({ username, email, passwordHash, color, city });
		const savedHomeLocation = await saveHomeLocation(user, req.body);

		// Upload profile image if provided
		let avatarUrl = null;
		if (req.file) {
			console.log('[Registration] Uploading profile image...', {
				mimetype: req.file.mimetype,
				size: req.file.size
			});
			try {
				const { uploadToSupabaseStorage } = require('../user-service/storage.upload');
				avatarUrl = await uploadToSupabaseStorage(req.file.buffer, req.file.mimetype, 'profiles');
				console.log('[Registration] Image uploaded successfully:', avatarUrl);

				// Update user with avatar
				const updateResult = await User.updateOne(
					{ _id: user._id },
					{ $set: { avatarUrl } }
				);
				console.log('[Registration] User updated with avatarUrl, result:', updateResult);
			} catch (uploadError) {
				console.error('[Registration] ⚠️ PROFILE IMAGE UPLOAD FAILED');
				console.error('[Registration] Error Message:', uploadError.message);
				if (uploadError.stack) console.error('[Registration] Stack:', uploadError.stack);
				// Don't fail registration if image upload fails, just continue without avatar
				avatarUrl = null;
			}
		} else {
			console.log('[Registration] No profile image file in request');
		}

		const tokens = createAuthTokens(user);
		await storeRefreshToken(user._id, tokens.refreshToken, req);
		res.cookie('refreshToken', tokens.refreshToken, {
			httpOnly: true,
			secure: process.env.NODE_ENV === 'production',
			sameSite: 'strict',
			maxAge: 7 * 24 * 60 * 60 * 1000,
		});

		const userPayload = buildAuthUserPayload(user, savedHomeLocation);
		if (avatarUrl) {
			userPayload.avatarUrl = avatarUrl;
			console.log('[Registration] Added avatarUrl to payload:', avatarUrl);
		}

		console.log('[Registration] Final user payload:', JSON.stringify(userPayload, null, 2));

		res.status(201).json({ user: userPayload, ...tokens });
	} catch (error) {
		next(error);
	}
}

async function login(req, res, next) {
	try {
		const { email, password } = req.body;
		const user = await User.findOne({ email });
		if (!user || !user.passwordHash) {
			return res.status(401).json({ error: 'Invalid credentials' });
		}

		const isValid = await bcrypt.compare(password, user.passwordHash);
		if (!isValid) {
			return res.status(401).json({ error: 'Invalid credentials' });
		}

		const savedHomeLocation = await saveHomeLocation(user, req.body);
		await User.updateOne({ _id: user._id }, { $set: { lastActiveAt: new Date() } });

		const tokens = createAuthTokens(user);
		await storeRefreshToken(user._id, tokens.refreshToken, req);
		res.cookie('refreshToken', tokens.refreshToken, {
			httpOnly: true,
			secure: process.env.NODE_ENV === 'production',
			sameSite: 'strict',
			maxAge: 7 * 24 * 60 * 60 * 1000,
		});
		res.json({ user: buildAuthUserPayload(user, savedHomeLocation), ...tokens });
	} catch (error) {
		next(error);
	}
}

async function me(req, res, next) {
	try {
		const user = await User.findById(req.userId);
		if (!user) return res.status(404).json({ error: 'User not found' });
		res.json({ user: user.publicProfile });
	} catch (error) {
		next(error);
	}
}

module.exports = {
	register,
	login,
	me,
};
