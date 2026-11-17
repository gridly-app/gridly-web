function words(value: string) {
	return (
		value
			.normalize("NFKC")
			.toLocaleLowerCase("ru")
			.replaceAll("ё", "е")
			.match(/[\p{L}\p{N}]+/gu) ?? []
	);
}

function nearWord(term: string, word: string) {
	if (word.includes(term)) return true;
	if (term.length < 4 || /\d/.test(term) || /\d/.test(word)) return false;
	const limit = term.length >= 8 ? 2 : 1;
	if (Math.abs(term.length - word.length) > limit) return false;

	// Count insertions, deletions, replacements and adjacent transpositions.
	let previous = Array.from({ length: word.length + 1 }, (_, index) => index);
	let beforePrevious = previous;
	for (let row = 1; row <= term.length; row++) {
		const current = [row];
		for (let column = 1; column <= word.length; column++) {
			const transposed =
				row > 1 &&
				column > 1 &&
				term[row - 1] === word[column - 2] &&
				term[row - 2] === word[column - 1];
			current[column] = Math.min(
				(current[column - 1] ?? Infinity) + 1,
				(previous[column] ?? Infinity) + 1,
				(previous[column - 1] ?? Infinity) +
					Number(term[row - 1] !== word[column - 1]),
				transposed ? (beforePrevious[column - 2] ?? Infinity) + 1 : Infinity,
			);
		}
		beforePrevious = previous;
		previous = current;
	}
	return (previous[word.length] ?? Infinity) <= limit;
}

export function adminSearch(query: string) {
	const terms = words(query);
	const joined = terms.join("");
	return (fields: string[]) => {
		if (!joined) return true;
		const normalized = fields.map(words);
		const tokens = normalized.flat();
		return (
			normalized.some((field) => field.join("").includes(joined)) ||
			terms.every((term) => tokens.some((word) => nearWord(term, word)))
		);
	};
}
