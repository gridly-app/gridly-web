import { expect, test } from "bun:test";
import { act } from "react";
import { mountDom } from "../../../../../../../../tests/support/dom";
import { MapSizeFields } from "./MapSizeFields";

test("a server validation error is announced by the matching dimension field", async () => {
	const { root, close } = mountDom();

	try {
		act(() =>
			root.render(
				<MapSizeFields
					width={8}
					height={9}
					widthError="Нужна большая ширина"
				/>,
			),
		);

		const width = document.querySelector('input[name="width"]');
		const height = document.querySelector('input[name="height"]');
		const descriptionId = width?.getAttribute("aria-describedby");
		const description = descriptionId
			? document.getElementById(descriptionId)
			: null;

		expect(width?.getAttribute("aria-invalid")).toBe("true");
		expect(description?.textContent).toBe("Нужна большая ширина");
		expect(height?.getAttribute("aria-invalid")).not.toBe("true");
	} finally {
		await close();
	}
});
