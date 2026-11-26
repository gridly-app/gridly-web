import { expect, test } from "bun:test";

import { signInDestination } from "./signInDestination";

test("login restores the warehouse URL with the same query and fragment", () => {
	const returnTo = "/warehouses/demo/inventory?view=writeoffs#filters";

	expect(signInDestination({ returnTo })).toBe(returnTo);
});

test.each([
	null,
	{},
	{ returnTo: 42 },
	{ returnTo: "https://example.test" },
	{ returnTo: "//example.test" },
	{ returnTo: "/\\example.test" },
	{ returnTo: "/\t/example.test" },
])("login falls back to the workspace for an invalid return state", (state) => {
	expect(signInDestination(state)).toBe("/app");
});
