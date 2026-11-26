import { expect, test } from "bun:test";
import { MemoryRouter } from "react-router-dom";

import { renderDom } from "../../../../../../../tests/support/rtl";
import { shipment } from "../../../../../../../tests/support/shipment";
import { ShipmentSharing } from "./ShipmentSharing";

async function renderSharing(canIssueLink: boolean) {
	async function notCalled(): Promise<never> {
		throw new Error("Not used");
	}

	return renderDom(
		<MemoryRouter>
			<ShipmentSharing
				warehouseId="warehouse-1"
				orderId="order-1"
				shipment={{ ...shipment(), share_link: null, allowed_actions: [] }}
				canIssueLink={canIssueLink}
				issueLink={notCalled}
				revokeLink={notCalled}
				retryLink={notCalled}
				run={notCalled}
				busy={false}
				attempt={null}
			/>
		</MemoryRouter>,
	);
}

test("a draft order cannot issue a client link and says why", async () => {
	const view = await renderSharing(false);

	try {
		const button = view.getByRole("button", { name: "Выпустить ссылку" });

		expect(button.hasAttribute("disabled")).toBe(true);
		expect(
			view.getByText(
				"Клиентскую ссылку можно выпустить, когда заказ выйдет из черновика.",
			).id,
		).toBe(button.getAttribute("aria-describedby") ?? "");
	} finally {
		await view.close();
	}
});

test("an active order can issue a client link", async () => {
	const view = await renderSharing(true);

	try {
		const button = view.getByRole("button", { name: "Выпустить ссылку" });

		expect(button.hasAttribute("disabled")).toBe(false);
		expect(
			view.queryByText(
				"Клиентскую ссылку можно выпустить, когда заказ выйдет из черновика.",
			),
		).toBeNull();
	} finally {
		await view.close();
	}
});
