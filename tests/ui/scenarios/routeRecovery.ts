import { expect } from "@playwright/test";

import type { UiScenario } from "../uiBrowserFixture";

export async function routeRecoveryScenario({ base, page }: UiScenario) {
	const protectedUrl = `${base}/warehouses/warehouse-demo/inventory?view=writeoffs`;

	await page.goto(protectedUrl);
	await expect(page).toHaveURL(`${base}/auth`);
	await expect(page.getByRole("radio", { name: "Списания" })).toHaveCount(0);

	await page
		.getByRole("button", { name: "Зарегистрироваться", exact: true })
		.click();
	await expect(page.getByLabel("Подтвердите пароль")).toBeVisible();
	await page.getByRole("button", { name: "Войти", exact: true }).click();
	await expect(page).toHaveURL(`${base}/auth`);
	await expect(page.getByLabel("Подтвердите пароль")).toHaveCount(0);

	await page.getByLabel("Логин", { exact: true }).fill("admin@gridly.local");
	await page.getByLabel("Пароль", { exact: true }).fill("gridly-demo");
	await page.getByRole("button", { name: "Войти", exact: true }).click();

	await expect(page).toHaveURL(protectedUrl);
	await expect(page.getByRole("radio", { name: "Списания" })).toBeChecked();

	for (const path of [
		"/missing-page",
		"/warehouses/warehouse-demo/missing-page",
	]) {
		await page.goto(`${base}${path}`);

		await expect(
			page.getByRole("heading", { name: "Страница не найдена" }),
		).toBeVisible();
		await expect(page).toHaveURL(`${base}${path}`);
	}
}

export async function routeChunkRecoveryScenario({
	base,
	errors,
	page,
}: UiScenario) {
	await page.route(
		"**/src/app/modules/landing/Landing.tsx",
		(route) => route.abort(),
		{ times: 1 },
	);
	await page.goto(base);

	await expect(page.getByRole("alert")).toContainText(
		"Не удалось открыть страницу",
	);
	await page.getByRole("button", { name: "Перезагрузить страницу" }).click();
	await expect(page.getByRole("heading", { name: "Gridly" })).toBeVisible();

	const expected = `TypeError: Failed to fetch dynamically imported module: ${base}/src/app/modules/landing/Landing.tsx`;
	expect(errors.some((error) => error.includes(expected))).toBe(true);

	const unexpected = errors.filter((error) => !error.includes(expected));
	errors.splice(0, errors.length, ...unexpected);
}
