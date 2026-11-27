const floatTolerance = 8 * Number.EPSILON;

export function quantityDifference(expected: number, actual: number) {
	const difference = expected - actual;
	const tolerance = floatTolerance * Math.max(expected, actual);

	return Math.abs(difference) <= tolerance ? 0 : difference;
}
