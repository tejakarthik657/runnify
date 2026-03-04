const { Territory, User } = require('../core/schema');
const { hexCenter, hexesInBoundingBox, gpsToHex } = require('../run-service/h3.service');
const { applyDecay } = require('../run-service/credit.engine');

const MAX_BBOX_HEXES = 5000;

async function getTerritoriesByBbox({ minLat, minLng, maxLat, maxLng }) {
	const hexIds = hexesInBoundingBox(minLat, minLng, maxLat, maxLng);
	if (hexIds.length > MAX_BBOX_HEXES) {
		throw new Error(`Bounding box too large. Zoom in further. (${hexIds.length} hexes, max ${MAX_BBOX_HEXES})`);
	}

	const now = Date.now();
	const rollingWindowStart = new Date(now - 24 * 60 * 60 * 1000);
	const rollingWindowEnd = new Date(now + 24 * 60 * 60 * 1000);

	const privateUsers = await User.find({ 'privacy.hideFromMap': true }).select('_id').lean();
	const privateIds = privateUsers.map((user) => user._id);

	const territories = await Territory.find({
		hexId: { $in: hexIds },
		ownerId: { $nin: privateIds },
		claimedAt: { $gte: rollingWindowStart },
	})
		.select('hexId ownerId ownerUsername ownerColor creditValue lastActiveAt totalInvasions claimedAt')
		.lean();

	return {
		totalHexes: hexIds.length,
		claimedHexes: territories.length,
		window: {
			mode: 'rolling_24h',
			from: rollingWindowStart,
			to: rollingWindowEnd,
		},
		features: territories.map((territory) => ({
			hexId: territory.hexId,
			ownerId: territory.ownerId,
			ownerUsername: territory.ownerUsername,
			ownerColor: territory.ownerColor,
			creditValue: applyDecay(territory.creditValue, territory.lastActiveAt),
			invasionCount: territory.totalInvasions || 0,
			claimedAt: territory.claimedAt,
			expiresAt: new Date(new Date(territory.claimedAt).getTime() + 24 * 60 * 60 * 1000),
		})),
	};
}

async function getHexDetails(hexId) {
	const territory = await Territory.findOne({ hexId })
		.populate('ownerId', 'username color hexesOwned credits globalRank')
		.lean();

	if (!territory) {
		return { hexId, status: 'unclaimed' };
	}

	const center = hexCenter(hexId);
	const currentValue = applyDecay(territory.creditValue, territory.lastActiveAt);

	return {
		hexId,
		status: 'claimed',
		owner: {
			id: territory.ownerId?._id,
			username: territory.ownerUsername,
			color: territory.ownerColor,
			hexesOwned: territory.ownerId?.hexesOwned,
			credits: territory.ownerId?.credits,
			rank: territory.ownerId?.globalRank,
		},
		creditValue: currentValue,
		claimedAt: territory.claimedAt,
		lastActiveAt: territory.lastActiveAt,
		invasionCount: territory.totalInvasions || 0,
		center,
		recentInvasions: (territory.invasionLog || []).slice(-5).reverse(),
	};
}

async function searchTerritoryByUsername(username) {
	const user = await User.findOne({ username: new RegExp(`^${username}$`, 'i') })
		.select('_id username color credits hexesOwned globalRank')
		.lean();

	if (!user) return { found: false, message: `No user found: ${username}` };

	const territories = await Territory.find({ ownerId: user._id })
		.select('hexId creditValue lastActiveAt totalInvasions')
		.lean();

	let centerLat = 0;
	let centerLng = 0;
	for (const territory of territories) {
		const center = hexCenter(territory.hexId);
		centerLat += center.lat;
		centerLng += center.lng;
	}
	if (territories.length > 0) {
		centerLat /= territories.length;
		centerLng /= territories.length;
	}

	return {
		found: true,
		user: {
			id: user._id,
			username: user.username,
			color: user.color,
			credits: user.credits,
			hexesOwned: user.hexesOwned,
			rank: user.globalRank,
		},
		hexCount: territories.length,
		hexIds: territories.map((territory) => territory.hexId),
		mapFlyTo: territories.length > 0 ? { lat: centerLat, lng: centerLng } : null,
	};
}

async function searchLocationToHex(query) {
	const encoded = encodeURIComponent(query);
	const url = `https://nominatim.openstreetmap.org/search?q=${encoded}&format=json&limit=1`;
	const response = await fetch(url, {
		headers: { 'User-Agent': 'TerritoryRun/1.0 (contact@territoryrun.com)' },
	});
	const results = await response.json();

	if (!results || results.length === 0) {
		return { found: false, message: 'Location not found' };
	}

	const { lat, lon: lng, display_name: displayName } = results[0];
	const latNum = parseFloat(lat);
	const lngNum = parseFloat(lng);
	const hexId = gpsToHex(latNum, lngNum);

	const territory = await Territory.findOne({ hexId })
		.select('ownerUsername ownerColor creditValue')
		.lean();

	return {
		found: true,
		location: { displayName, lat: latNum, lng: lngNum },
		hexId,
		territory: territory
			? {
				ownerUsername: territory.ownerUsername,
				ownerColor: territory.ownerColor,
				creditValue: territory.creditValue,
			}
			: null,
	};
}

async function getCityTerritoryStats(city) {
	const topTerritories = await Territory.aggregate([
		{ $match: { city } },
		{
			$group: {
				_id: '$ownerId',
				username: { $first: '$ownerUsername' },
				color: { $first: '$ownerColor' },
				hexCount: { $sum: 1 },
				totalValue: { $sum: '$creditValue' },
			},
		},
		{ $sort: { hexCount: -1 } },
		{ $limit: 10 },
	]);

	const totalCityHexes = await Territory.countDocuments({ city });
	return {
		city,
		totalHexesClaimed: totalCityHexes,
		topOwners: topTerritories,
	};
}

module.exports = {
	getTerritoriesByBbox,
	getHexDetails,
	searchTerritoryByUsername,
	searchLocationToHex,
	getCityTerritoryStats,
};
