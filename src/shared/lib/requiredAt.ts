export function requiredAt<T>(values: readonly T[], index: number): T {
	const value = values[index];
	if (value === undefined)
		throw new RangeError(`Missing element at index ${index}`);
	return value;
}
