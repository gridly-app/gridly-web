import { expect, test } from "bun:test";

import { credentialsFormRules, readCredentials } from "./credentialsForm";

test("extended login rules apply only to registration", () => {
	const data = new FormData();
	data.set("login", " legacy user ");
	data.set("password", " password ");
	data.set("passwordConfirmation", " password ");

	const loginRules = credentialsFormRules("login", true);
	const standardRegistration = credentialsFormRules("register", false);
	const extendedRegistration = credentialsFormRules("register", true);
	const credentials = { login: "legacy user", password: " password " };

	expect(readCredentials(data, loginRules)).toEqual({ ok: true, credentials });
	expect(readCredentials(data, standardRegistration)).toEqual({
		ok: true,
		credentials,
	});
	expect(readCredentials(data, extendedRegistration)).toMatchObject({
		ok: false,
		field: "login",
	});
});

test("registration reports a password confirmation mismatch before preparing credentials", () => {
	const data = new FormData();
	data.set("login", "operator");
	data.set("password", " password ");
	data.set("passwordConfirmation", "password");

	expect(
		readCredentials(data, credentialsFormRules("register", false)),
	).toEqual({
		ok: false,
		field: "passwordConfirmation",
		message: "Пароли не совпадают. Повторите пароль ещё раз.",
	});
});
