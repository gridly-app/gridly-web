import { expect, test } from "bun:test";
import { loginSchema, newLoginSchema } from ".";

test("new logins share the proposed format and trim without changing case", () => {
	for (const length of [2, 3, 254, 255]) {
		expect(newLoginSchema.safeParse("a".repeat(length)).success).toBe(
			length === 3 || length === 254,
		);
	}

	expect(newLoginSchema.parse(" User+tag@Example.com ")).toBe(
		"User+tag@Example.com",
	);
	expect(newLoginSchema.safeParse("user name").success).toBe(false);
	expect(newLoginSchema.safeParse("user/name").success).toBe(false);
});

test("authentication and unchanged legacy logins allow existing account formats", () => {
	expect(loginSchema.parse(" Старый логин ")).toBe("Старый логин");
	expect(loginSchema.parse("ab")).toBe("ab");
	expect(loginSchema.parse("a".repeat(254))).toHaveLength(254);
});
