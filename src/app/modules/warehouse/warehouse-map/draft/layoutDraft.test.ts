import { expect, test } from "bun:test";
import { warehouse } from "../../../../../../tests/support/warehouse";
import {
	createLayoutDraft,
	isCurrentLayout,
	restoreLayoutDraft,
} from "./layoutDraft";

test("editing a draft leaves the saved cells and routes intact", () => {
	const saved = warehouse();
	saved.draft = [{ x: 1, y: 1, type: "wall" }];
	saved.draftRevision = 9;

	const draft = createLayoutDraft(saved);
	draft.cells[0] = { x: 1, y: 1, type: "empty" };

	expect(saved.draft).toEqual([{ x: 1, y: 1, type: "wall" }]);
	expect(saved.cells).toEqual([{ x: 1, y: 1, type: "aisle" }]);
	expect(draft).toMatchObject({ baseVersion: 1, draftRevision: 9 });
});

test("a restored submission retains its original versions after the server layout changes", () => {
	const saved = warehouse();
	saved.version = 3;
	saved.draftRevision = 11;

	const draft = restoreLayoutDraft(saved, {
		status: "conflict",
		command: {
			action: "saveMap",
			value: {
				baseVersion: 1,
				draftRevision: 9,
				cells: [{ x: 1, y: 1, type: "wall" }],
				routes: [],
			},
		},
	});
	if (!draft) throw new Error("The snapshot did not restore");

	expect(draft).toMatchObject({
		baseVersion: 1,
		draftRevision: 9,
		cells: [{ x: 1, y: 1, type: "wall" }],
	});
	expect(isCurrentLayout(draft, saved)).toBe(false);
});
