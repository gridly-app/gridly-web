import { expect, test } from "bun:test";

import { textSearch, createTextIndex, textSearchQuery } from "./textSearch";

test("search matches two words with misspellings in an existing index", () => {
	const index = createTextIndex(["Документ опубликован"]);

	expect(textSearchQuery("докумнет опубилкован")?.(index)).toBe(true);
});

test("search treats е and ё alike", () => {
	expect(textSearch("елка")(["Ёлка"])).toBe(true);
});

test("numeric identifiers match substrings without fuzzy edits", () => {
	const matches = textSearch("١٢٣٤");

	expect(matches(["Склад № ١٢٣٤"])).toBe(true);
	expect(matches(["Склад № ١٣٢٤"])).toBe(false);
	expect(matches(["Склад № ١٢٣٤٥"])).toBe(true);
});

test("a query with only punctuation does not filter the list", () => {
	expect(textSearch("...")(["Любая строка"])).toBe(true);
});

test("long tokens stay within the two-edit limit", () => {
	const prefix = "а".repeat(2000);

	expect(textSearch(prefix + "бвгд")([prefix + "вбгж"])).toBe(true);
	expect(textSearch(prefix + "бвгд")([prefix + "вбжз"])).toBe(false);
});
