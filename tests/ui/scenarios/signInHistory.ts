import { expect } from "@playwright/test";
import type { UiScenario } from "../uiBrowserFixture";

export async function signInHistoryScenario({ page, base }: UiScenario) {
	await page.goto(`${base}/auth?mode=register`);
	await page.getByRole("button", { name: "Войти", exact: true }).click();
	await page.getByLabel("Пароль", { exact: true }).fill("abcdefgh");
	await page.getByRole("checkbox", { name: "Показать пароль" }).check();
	await page.goBack();

	const password = page.getByLabel("Пароль", { exact: true });
	const confirmation = page.getByLabel("Подтвердите пароль", { exact: true });
	const lengthHint = page
		.getByRole("status")
		.filter({ hasText: "Не менее 8 символов" });
	const matchHint = page
		.getByRole("status")
		.filter({ hasText: "Пароли должны совпадать" });

	await expect(confirmation).toBeVisible();
	await expect(password).toHaveValue("");
	await expect(password).toHaveAttribute("type", "password");
	await expect(lengthHint).toHaveAttribute("data-complete", "false");
	await expect(matchHint).toHaveAttribute("data-complete", "false");
	await page.getByLabel("Логин", { exact: true }).fill("review-user");
	await password.fill("abcdefgh");
	await confirmation.fill("different");
	await page
		.getByRole("button", { name: "Зарегистрироваться", exact: true })
		.click();
	await expect(page.getByRole("alert")).toContainText("Пароли не совпадают");
	await confirmation.fill("abcdefgh");
	await expect(page.getByRole("alert")).toHaveCount(0);
	await expect(
		page.getByRole("status").filter({ hasText: "Пароли совпадают" }),
	).toHaveAttribute("data-complete", "true");
	await page.goForward();
	await expect(confirmation).toHaveCount(0);
	await expect(password).toHaveValue("");
	await expect(page.getByRole("alert")).toHaveCount(0);
	await page.goBack();
	await expect(confirmation).toHaveValue("");
	await expect(lengthHint).toHaveAttribute("data-complete", "false");
	await page.goForward();
	await page.route("**/api/v1/auth/login", (route) => {
		expect(route.request().postDataJSON()).toEqual({
			login: "review-user",
			password: " password ",
		});

		return route.fulfill({
			status: 401,
			json: { code: "INVALID_CREDENTIALS" },
		});
	});
	await page.getByLabel("Логин", { exact: true }).fill(" review-user ");
	await password.fill(" password ");
	await page.getByRole("button", { name: "Войти", exact: true }).click();
	await expect(page.getByRole("alert")).toContainText(
		"Проверьте логин и пароль",
	);
	await page.goBack();
	await expect(confirmation).toHaveValue("");
	await expect(page.getByRole("alert")).toHaveCount(0);
}
