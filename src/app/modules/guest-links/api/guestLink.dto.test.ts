import { expect, test } from "bun:test";

import { guestLinksSchema } from "./guestLink.dto";

test("rejects duplicate guest links in a warehouse response", () => {
	const link = {
		id: "link-1",
		name: "Заказчику",
		revision: 1,
		status: "active",
		expires_at: "2099-02-28T12:00:00Z",
		order_ids: ["order-1"],
		sections: [],
	};
	const items = [link, { ...link, revision: 2 }];
	const result = guestLinksSchema.safeParse({ items });

	expect(result.success).toBe(false);
});
