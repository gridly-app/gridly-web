import { expect, test } from "bun:test";

import { statusTone } from "./statusTone";

test("statuses map to the tone of their badge", () => {
	expect(statusTone("in_progress")).toBe("accent");
	expect(statusTone("waiting_confirmation")).toBe("warning");
	expect(statusTone("received_with_losses")).toBe("danger");
	expect(statusTone("completed")).toBe("success");
	expect(statusTone("draft")).toBe("neutral");
	expect(statusTone("unknown-status")).toBe("neutral");
});
