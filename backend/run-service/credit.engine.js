const { CreditEngine } = require('../core/services');

const CREDITS_PER_CLAIMED_HEX = 10;
const CREDITS_PER_INVADED_HEX = 25;
const PEAK_HOUR_MULTIPLIER = 1.5;
const DECAY_RATE_PER_DAY = 0.98;
const CREDIT_TRANSFER_ON_LOSS = 5;

function isPeakHour(timestamp = Date.now(), timezone = 'UTC') {
	let localHour;
	try {
		const options = { hour: '2-digit', hour12: false, timeZone: timezone };
		const formatter = new Intl.DateTimeFormat('en-US', options);
		const formatted = formatter.format(new Date(timestamp));
		localHour = Number(formatted);
	} catch {
		localHour = new Date(timestamp).getUTCHours();
	}
	return (localHour >= 6 && localHour < 9) || (localHour >= 17 && localHour < 20);
}

function calculateRunCredits(hexesClaimed = [], hexesInvaded = [], skirmishHexCount = 0, timestamp = Date.now(), timezone = 'UTC') {
	const claimedBase = hexesClaimed.length * CREDITS_PER_CLAIMED_HEX;
	const skirmishBonus = skirmishHexCount * CREDITS_PER_CLAIMED_HEX * 2;
	const invasionBonus = hexesInvaded.length * CREDITS_PER_INVADED_HEX;
	const subtotal = claimedBase + invasionBonus + skirmishBonus;
	const peakMultiplier = isPeakHour(timestamp, timezone) ? PEAK_HOUR_MULTIPLIER : 1.0;
	const total = Math.floor(subtotal * peakMultiplier);

	return {
		hexesClaimed: hexesClaimed.length,
		hexesInvaded: hexesInvaded.length,
		skirmishHexCount,
		claimedBase,
		invasionBonus,
		skirmishBonus,
		peakMultiplier,
		total,
	};
}

function calculateDefenderLoss(hexCount) {
	return hexCount * CREDIT_TRANSFER_ON_LOSS;
}

function applyDecay(creditValue, lastActiveAt, decayMultiplier = 1) {
  const msInactive = Date.now() - new Date(lastActiveAt).getTime();
  const daysInactive = msInactive / (1000 * 60 * 60 * 24);
  const decayFactor = Math.pow(DECAY_RATE_PER_DAY, Math.floor(daysInactive) * decayMultiplier);
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
