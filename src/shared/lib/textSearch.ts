const minimumTypoLength = 4;
const twoTypoLength = 8;
const numberToken = /\p{N}/u;

function words(value: string) {
	return (
		value
			.normalize("NFKC")
			.toLocaleLowerCase("ru")
			.replaceAll("ё", "е")
			.match(/[\p{L}\p{N}]+/gu) ?? []
	);
}

function matchesWithTypos(term: string, word: string) {
	if (word.includes(term)) return true;
	if (numberToken.test(term) || numberToken.test(word)) return false;

	const query = Array.from(term);
	const target = Array.from(word);
	const limit = query.length >= twoTypoLength ? 2 : 1;

	if (
		query.length < minimumTypoLength ||
		Math.abs(query.length - target.length) > limit
	)
		return false;

	const unreachable = limit + 1;
	let previousRow = new Map<number, number>();
	let twoRowsBack = new Map<number, number>();
	let current = new Map<number, number>();

	for (let column = 0; column <= Math.min(limit, target.length); column++) {
		previousRow.set(column, column);
	}

	for (let row = 1; row <= query.length; row++) {
		current.clear();

		if (row <= limit) current.set(0, row);

		const start = Math.max(1, row - limit);
		const end = Math.min(target.length, row + limit);

		for (let column = start; column <= end; column++) {
			const transposed =
				row > 1 &&
				column > 1 &&
				query[row - 1] === target[column - 2] &&
				query[row - 2] === target[column - 1];
			const transposition = transposed
				? (twoRowsBack.get(column - 2) ?? unreachable) + 1
				: unreachable;
			const distance = Math.min(
				(current.get(column - 1) ?? unreachable) + 1,
				(previousRow.get(column) ?? unreachable) + 1,
				(previousRow.get(column - 1) ?? unreachable) +
					Number(query[row - 1] !== target[column - 1]),
				transposition,
			);

			current.set(column, distance);
		}

		[twoRowsBack, previousRow, current] = [previousRow, current, twoRowsBack];
	}

	return (previousRow.get(target.length) ?? unreachable) <= limit;
}

export function createTextIndex(fields: string[]) {
	const normalized = fields.map(words);

	return {
		fields: normalized.map((field) => field.join("")),
		tokens: normalized.flat(),
	};
}

export function textSearchQuery(query: string) {
	const terms = words(query);
	const joined = terms.join("");

	if (!joined) return null;

	return (index: ReturnType<typeof createTextIndex>) =>
		index.fields.some((field) => field.includes(joined)) ||
		terms.every((term) =>
			index.tokens.some((word) => matchesWithTypos(term, word)),
		);
}

export function textSearch(query: string) {
	const matches = textSearchQuery(query);

	return (fields: string[]) => !matches || matches(createTextIndex(fields));
}
