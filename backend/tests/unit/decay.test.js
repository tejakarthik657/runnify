const { applyDecay } = require('../../run-service/credit.engine');

describe('Decay Engine', () => {
	test('fresh hex has no decay', () => {
		const result = applyDecay(10, new Date());
		expect(result).toBe(10);
	});

	test('10-day inactive hex loses about 18%', () => {
		const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
		const result = applyDecay(100, tenDaysAgo);
		expect(result).toBeGreaterThan(80);
		expect(result).toBeLessThan(85);
	});

	test('decay never returns less than 1', () => {
		const veryOldDate = new Date(0);
		const result = applyDecay(1, veryOldDate);
		expect(result).toBe(1);
	});
});
