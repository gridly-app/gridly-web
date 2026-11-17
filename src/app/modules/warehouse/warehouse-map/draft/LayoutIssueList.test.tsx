import { expect, mock, test } from "bun:test";
import { act } from "react";
import { mountDom } from "../../../../../../tests/support/dom";
import { LayoutIssueList } from "./LayoutIssueList";

test("clicking a layout validation issue selects the cell identified by the server", async () => {
	const { root, close } = mountDom();
	const cell = { x: 1, y: 2, type: "aisle" } as const;
	const onSelectCell = mock();

	try {
		act(() =>
			root.render(
				<LayoutIssueList
					issues={[{ kind: "cell", key: "1,2", message: "Перекрыт проезд" }]}
					cells={new Map([["1,2", cell]])}
					onSelectCell={onSelectCell}
				/>,
			),
		);
		const button = document.querySelector("button");
		expect(button?.textContent).toBe("Клетка 1,2 — Перекрыт проезд");
		act(() => button?.click());
		expect(onSelectCell).toHaveBeenCalledWith(cell);
	} finally {
		await close();
	}
});
