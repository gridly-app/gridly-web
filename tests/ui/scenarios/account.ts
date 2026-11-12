import { expect } from "@playwright/test";
import type { UiScenario } from "../uiBrowserFixture";

export async function accountScenario({
	base,
	context,
	page,
	ready,
	screenshot,
}: UiScenario) {
	await page.goto(`${base}/auth`);
	await expect(
		page.getByRole("textbox", { name: "Логин", exact: true }),
	).toBeVisible();
	await screenshot("auth");
	await page.getByRole("button", { name: "Войти", exact: true }).click();
	expect(
		await page
			.getByLabel("Логин", { exact: true })
			.evaluate((element: HTMLInputElement) => element.validity.valueMissing),
	).toBe(true);
	await page.getByLabel("Логин", { exact: true }).fill("admin@gridly.local");
	await page.getByLabel("Пароль", { exact: true }).fill("gridly-demo");
	await page.getByRole("checkbox", { name: "Показать пароль" }).check();
	await expect(page.getByLabel("Пароль", { exact: true })).toHaveAttribute(
		"type",
		"text",
	);
	await page.getByRole("button", { name: "Войти", exact: true }).click();
	await page.waitForURL("**/warehouses/warehouse-demo/**");
	await expect(page.locator("canvas").first()).toBeVisible();

	await ready("map");
	const otherTab = await context.newPage();
	try {
		await otherTab.route("**/api/v1/**", (route) => {
			const request = route.request();
			if (
				new URL(request.url()).pathname === "/api/v1/auth/login" &&
				request.method() === "POST"
			)
				return route.fulfill({
					json: {
						access_token: "other-account-token",
						user: { login: "other@gridly.local" },
					},
				});
			return route.fulfill({ json: { items: [], total: 0 } });
		});
		await otherTab.goto(`${base}/auth`);
		await otherTab
			.getByLabel("Логин", { exact: true })
			.fill("other@gridly.local");
		await otherTab.getByLabel("Пароль", { exact: true }).fill("gridly-demo");
		await otherTab.getByRole("button", { name: "Войти", exact: true }).click();
		await expect(page.getByLabel("Логин", { exact: true })).toBeVisible();
		await expect(
			page.getByText("Аккаунт в браузере изменился. Войдите снова."),
		).toBeVisible();
		await expect(page.locator('[data-page="map"]')).toHaveCount(0);
	} finally {
		await otherTab.close();
	}
	console.log(
		"PASS signing in as another account ends the previous tab session",
	);
}
