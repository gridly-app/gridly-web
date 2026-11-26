import { expect, test } from "bun:test";

import { applySearchParamChanges } from "./searchParams";

test("sets, replaces and removes search params without touching the rest", () => {
	const current = new URLSearchParams(
		"tab=orders&order=o-1&highlight=unpriced",
	);

	const next = applySearchParamChanges(current, {
		order: "o-2",
		highlight: null,
		status: "active",
	});

	expect(next.toString()).toBe("tab=orders&order=o-2&status=active");
	expect(current.toString()).toBe("tab=orders&order=o-1&highlight=unpriced");
});
