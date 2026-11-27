import { expect, test } from "bun:test";

import type { CommandPayloads } from "@/domain/warehouse";
import { renderDom } from "../../../../../../../tests/support/rtl";
import { WriteOffForm } from "./WriteOffForm";

test("a quantity above the available stock is explained and never submitted", async () => {
	const writes: CommandPayloads["writeoff"][] = [];
	const result = await renderDom(
		<WriteOffForm
			stock={{
				id: "batch-1",
				product: "p",
				quantity: 12,
				availableQuantity: 3,
				reserved: 9,
				expires: "",
				cell: "1,2",
				canWriteOff: true,
				revision: 4,
			}}
			isPending={false}
			onSave={async (write) => {
				writes.push(write);
			}}
		/>,
	);

	try {
		const quantity = result.getByRole("spinbutton", { name: "Количество *" });
		const reason = result.getByRole("textbox", { name: "Причина *" });
		const send = result.getByRole("button", { name: "Подтвердить списание" });

		await result.user.clear(quantity);
		await result.user.type(quantity, "4");
		await result.user.type(reason, "Повреждение");
		await result.user.click(send);

		expect((await result.findByRole("alert")).textContent).toContain(
			"доступный",
		);
		expect(writes).toEqual([]);

		await result.user.clear(quantity);
		await result.user.type(quantity, "3");
		await result.user.click(send);

		expect(writes).toEqual([
			{ id: "batch-1", quantity: 3, reason: "Повреждение", revision: 4 },
		]);
		expect(result.queryByRole("alert")).toBeNull();
	} finally {
		await result.close();
	}
});
