import { cleanup, render } from "@testing-library/react/pure";
import userEvent from "@testing-library/user-event";
import type { ReactElement } from "react";

import { registerTestDom } from "./dom";

export async function renderDom(element: ReactElement) {
	const unregister = registerTestDom();

	async function close() {
		try {
			cleanup();
		} finally {
			await unregister();
		}
	}

	try {
		return { ...render(element), user: userEvent.setup({ document }), close };
	} catch (error) {
		await close();

		throw error;
	}
}
