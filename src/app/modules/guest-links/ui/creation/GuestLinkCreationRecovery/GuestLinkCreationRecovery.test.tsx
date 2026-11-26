import { expect, test } from "bun:test";

import { renderDom } from "../../../../../../../tests/support/rtl";
import { GuestLinkCreationRecovery } from "./GuestLinkCreationRecovery";

test("only an eligible, idle attempt can be replayed", async () => {
	let retries = 0;
	let refreshes = 0;
	const props = {
		name: "Ссылка для клиента",
		message: undefined,
		onRefresh: async () => {
			refreshes++;
		},
		onRetry: () => {
			retries++;
		},
	};
	const result = await renderDom(
		<GuestLinkCreationRecovery {...props} isBusy={false} canRetry={false} />,
	);
	const retryLabel = { name: "Повторить тот же выпуск" };

	try {
		expect(result.queryByRole("button", retryLabel)).toBeNull();
		await result.user.click(
			result.getByRole("button", { name: "Обновить список" }),
		);
		expect(refreshes).toBe(1);

		result.rerender(
			<GuestLinkCreationRecovery {...props} isBusy={true} canRetry />,
		);
		const busy = result.getByRole("button", retryLabel);
		expect(busy.hasAttribute("disabled")).toBe(true);
		await result.user.click(busy);
		expect(retries).toBe(0);

		result.rerender(
			<GuestLinkCreationRecovery {...props} isBusy={false} canRetry />,
		);
		await result.user.click(result.getByRole("button", retryLabel));
		expect(retries).toBe(1);
	} finally {
		await result.close();
	}
});
