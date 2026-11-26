import { expect, test } from "bun:test";
import { act } from "@testing-library/react/pure";

import { SessionContext, type SessionState } from "@/ports/session";
import { renderDom } from "../../../tests/support/rtl";
import { AuthRoute } from "./AccountRoute";

const session: SessionState = {
	scopeId: 1,
	sessionId: null,
	user: "",
	status: "ended",
	error: "",
	restore: async () => {},
	authenticate: async () => {},
	logout: async () => {},
};

test("loss of connectivity replaces sign-in with guidance until the browser comes back online", async () => {
	const result = await renderDom(
		<SessionContext value={session}>
			<AuthRoute signIn={<button type="button">Войти</button>} />
		</SessionContext>,
	);

	function setOnline(isOnline: boolean) {
		act(() => {
			Object.defineProperty(navigator, "onLine", {
				value: isOnline,
				configurable: true,
			});
			window.dispatchEvent(new Event(isOnline ? "online" : "offline"));
		});
	}

	try {
		expect(result.getByRole("button", { name: "Войти" })).toBeTruthy();

		setOnline(false);
		expect(result.getByRole("alert").textContent).toContain(
			"Для входа подключитесь к сети",
		);
		expect(result.queryByRole("button", { name: "Войти" })).toBeNull();

		setOnline(true);
		expect(result.getByRole("button", { name: "Войти" })).toBeTruthy();
		expect(result.queryByRole("alert")).toBeNull();
	} finally {
		await result.close();
	}
});
