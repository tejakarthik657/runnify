const { CreditEngine } = require('../core/services');

const CREDITS_PER_CLAIMED_HEX = 10;
const CREDITS_PER_INVADED_HEX = 25;
const PEAK_HOUR_MULTIPLIER = 1.5;
const DECAY_RATE_PER_DAY = 0.98;
const CREDIT_TRANSFER_ON_LOSS = 5;

function isPeakHour(timestamp = Date.now()) {
	const hour = new Date(timestamp).getUTCHours();
	return (hour >= 6 && hour < 9) || (hour >= 17 && hour < 20);
}

function calculateRunCredits(hexesClaimed = [], hexesInvaded = [], timestamp = Date.now()) {
	const claimedBase = hexesClaimed.length * CREDITS_PER_CLAIMED_HEX;
	const invasionBonus = hexesInvaded.length * CREDITS_PER_INVADED_HEX;
	const subtotal = claimedBase + invasionBonus;
	const peakMultiplier = isPeakHour(timestamp) ? PEAK_HOUR_MULTIPLIER : 1.0;
	const total = Math.floor(subtotal * peakMultiplier);

	return {
		hexesClaimed: hexesClaimed.length,
		hexesInvaded: hexesInvaded.length,
		claimedBase,
		invasionBonus,
		peakMultiplier,
		total,
	};
}

function calculateDefenderLoss(hexCount) {
	return hexCount * CREDIT_TRANSFER_ON_LOSS;
}

function applyDecay(creditValue, lastActiveAt) {
	const msInactive = Date.now() - new Date(lastActiveAt).getTime();
	const daysInactive = msInactive / (1000 * 60 * 60 * 24);
	const decayFactor = Math.pow(DECAY_RATE_PER_DAY, Math.floor(daysInactive));
	const decayed = Math.floor(creditValue * decayFactor);
	return Math.max(decayed, 1);
}

module.exports = {
	...CreditEngine,
	CREDITS_PER_CLAIMED_HEX,
	CREDITS_PER_INVADED_HEX,
	PEAK_HOUR_MULTIPLIER,
	DECAY_RATE_PER_DAY,
	CREDIT_TRANSFER_ON_LOSS,
	isPeakHour,
	calculateRunCredits,
	calculateDefenderLoss,
	applyDecay,
};
