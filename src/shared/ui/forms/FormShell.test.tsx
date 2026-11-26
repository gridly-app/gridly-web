import { expect, test } from "bun:test";
import { act, fireEvent } from "@testing-library/react/pure";

import { ApiError } from "@/shared/http";
import { renderDom } from "../../../../tests/support/rtl";
import { FormShell } from "./FormShell";

test("submits the labeled field once, announces the server error and retries", async () => {
	const request = Promise.withResolvers<void>();
	const values: FormDataEntryValue[] = [];
	const result = await renderDom(
		<FormShell
			onSubmit={async (data) => {
				const value = data.get("name");
				if (value === null) throw new Error("Missing name");

				values.push(value);
				if (values.length === 1) await request.promise;
			}}
		>
			<label>
				Название
				<input name="name" required />
			</label>
		</FormShell>,
	);

	try {
		const name = result.getByRole("textbox", { name: "Название" });
		await result.user.type(name, "Склад");
		await result.user.click(result.getByRole("button", { name: "Сохранить" }));

		const busy = result.getByRole("button", { name: /^Сохраняем…/ });
		if (!(busy instanceof HTMLButtonElement))
			throw new Error("Expected a submit button");

		const form = busy.form;
		if (!form) throw new Error("Submit button is outside the form");

		expect(busy.disabled || busy.getAttribute("aria-disabled") === "true").toBe(
			true,
		);
		fireEvent.submit(form);
		expect(values).toEqual(["Склад"]);

		await act(async () =>
			request.reject(
				new ApiError("Internal server detail", 409, "STALE_REVISION"),
			),
		);

		expect((await result.findByRole("alert")).textContent).toContain(
			"Объект изменился",
		);
		const input = result.getByRole("textbox", { name: "Название" });
		if (!(input instanceof HTMLInputElement))
			throw new Error("Expected a name field");

		expect(input.value).toBe("Склад");

		await result.user.click(result.getByRole("button", { name: "Сохранить" }));

		expect(values).toEqual(["Склад", "Склад"]);
		expect(result.queryByRole("alert")).toBeNull();
	} finally {
		await act(async () => request.resolve());
		await result.close();
	}
});
