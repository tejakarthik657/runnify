const {
	calculateRunCredits,
	isPeakHour,
	calculateDefenderLoss,
	CREDITS_PER_CLAIMED_HEX,
	CREDITS_PER_INVADED_HEX,
} = require('../../run-service/credit.engine');

describe('Credit Engine', () => {
	test('calculateRunCredits: claimed only, off-peak', () => {
		const ts = new Date();
		ts.setUTCHours(2, 0, 0, 0);
		const result = calculateRunCredits(['hex1', 'hex2', 'hex3'], [], 0, ts.getTime());
		expect(result.total).toBe(3 * CREDITS_PER_CLAIMED_HEX);
		expect(result.peakMultiplier).toBe(1.0);
	});

	test('calculateRunCredits: invasions earn more credits', () => {
		const ts = new Date();
		ts.setUTCHours(2, 0, 0, 0);
		const result = calculateRunCredits([], ['hex1', 'hex2'], 0, ts.getTime());
		expect(result.total).toBe(2 * CREDITS_PER_INVADED_HEX);
	});

	test('calculateRunCredits: peak hour multiplier at 7 AM UTC', () => {
		const ts = new Date();
		ts.setUTCHours(7, 0, 0, 0);
		const result = calculateRunCredits(['hex1'], [], 0, ts.getTime());
		expect(result.peakMultiplier).toBe(1.5);
		expect(result.total).toBe(Math.floor(CREDITS_PER_CLAIMED_HEX * 1.5));
	});

	test('isPeakHour: 7 AM UTC is peak', () => {
		const ts = new Date();
		ts.setUTCHours(7, 0, 0, 0);
		expect(isPeakHour(ts.getTime())).toBe(true);
	});

	test('isPeakHour: 2 AM UTC is not peak', () => {
		const ts = new Date();
		ts.setUTCHours(2, 0, 0, 0);
		expect(isPeakHour(ts.getTime())).toBe(false);
	});

	test('calculateDefenderLoss: correct formula', () => {
		expect(calculateDefenderLoss(3)).toBe(15);
	});

	test('calculateRunCredits: mixed claimed + invaded off-peak', () => {
		const ts = new Date();
		ts.setUTCHours(2, 0, 0, 0);
		const result = calculateRunCredits(['a', 'b'], ['c'], 0, ts.getTime());
		const expected = (2 * CREDITS_PER_CLAIMED_HEX) + (1 * CREDITS_PER_INVADED_HEX);
		expect(result.total).toBe(expected);
	});

	test('calculateRunCredits: skirmish hex bonus applies 3x multiplier', () => {
		const ts = new Date();
		ts.setUTCHours(2, 0, 0, 0);
		const result = calculateRunCredits(['hex1', 'hex2'], [], 1, ts.getTime());
		expect(result.skirmishBonus).toBe(1 * CREDITS_PER_CLAIMED_HEX * 2);
		expect(result.total).toBe((2 * CREDITS_PER_CLAIMED_HEX) + (1 * CREDITS_PER_CLAIMED_HEX * 2));
	});
});
