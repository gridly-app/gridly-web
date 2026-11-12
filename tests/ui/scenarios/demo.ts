import { expect } from "@playwright/test";
import type { UiScenario } from "../uiBrowserFixture";

export async function demoScenario({
	api,
	base,
	page,
	screenshot,
}: UiScenario) {
	await page.goto(`${base}/`);
	await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
	await screenshot("landing");
	await page.setViewportSize({ width: 1440, height: 1000 });
	await page.emulateMedia({ reducedMotion: "no-preference" });
	await page.reload();
	const scenarios = page.getByRole("radiogroup", {
		name: "Складские сценарии",
	});
	await expect(scenarios).toBeVisible();
	await scenarios.getByRole("radio", { name: "Отгрузка", exact: true }).click();
	await expect(
		scenarios.getByRole("radio", { name: "Отгрузка", exact: true }),
	).toBeChecked();
	await expect
		.poll(() =>
			scenarios.evaluate((root) => {
				const thumb = root
					.querySelector('[data-slot="rubber-segment-thumb"]')
					?.getBoundingClientRect();
				const selected = root
					.querySelector('[role="radio"][data-checked]')
					?.getBoundingClientRect();
				return thumb && selected
					? Math.abs(thumb.x - selected.x) +
							Math.abs(thumb.width - selected.width)
					: Infinity;
			}),
		)
		.toBeLessThan(2);
	const shapeCanvas = page.locator('[data-slot="shape-grid-canvas"]');
	await expect(shapeCanvas).toBeVisible();
	expect(
		await shapeCanvas.evaluate(
			(el: HTMLCanvasElement) => el.width > 1 && el.height > 1,
		),
	).toBe(true);
	await page.mouse.move(200, 200);
	await screenshot("landing-pointer");
	await page.emulateMedia({ reducedMotion: "reduce" });
	await page.reload();
	await expect(page.locator('[data-slot="shape-grid-canvas"]')).toBeVisible();
	await page.setViewportSize({ width: 375, height: 1000 });
	expect(
		await page.evaluate(
			() => document.documentElement.scrollWidth > innerWidth,
		),
	).toBe(false);
	await page.evaluate(() => {
		document.documentElement.style.zoom = "2";
	});
	expect(
		await page.evaluate(
			() => document.documentElement.scrollWidth > innerWidth,
		),
	).toBe(false);
	await expect
		.poll(async () => {
			const heroTitle = await page.locator("h1 > span").boundingBox();
			return (
				!!heroTitle && heroTitle.x >= 0 && heroTitle.x + heroTitle.width <= 376
			);
		})
		.toBe(true);
	await screenshot("landing-zoom-200");
	await page.evaluate(() => {
		document.documentElement.style.zoom = "";
	});
	api.failDemo = true;
	await page.getByRole("button", { name: "Открыть демо", exact: true }).click();
	await expect(page.getByRole("alert")).toContainText(
		"Сервис временно недоступен",
	);
	await expect(
		page.getByRole("button", { name: "Открыть демо", exact: true }),
	).toBeEnabled();
	api.failDemo = false;
	await page.getByRole("button", { name: "Открыть демо", exact: true }).click();
	await page.waitForURL("**/demo/warehouses/warehouse-demo/**");
	await expect(page.locator("canvas").first()).toBeVisible();
	console.log("PASS landing and demo entry");
	await page.setViewportSize({ width: 1440, height: 1000 });
	const demoSettings = `${base}/demo/warehouses/warehouse-demo/settings`;
	await page.locator('a[href$="/settings"]').click();
	await page.waitForURL(demoSettings);
	const demoThreshold = page.getByLabel("Порог низкого остатка, шт.", {
		exact: true,
	});
	await expect(demoThreshold).toBeEnabled();
	const initialThreshold = await demoThreshold.inputValue();
	const changedThreshold = String(Number(initialThreshold) + 1);
	await demoThreshold.fill(changedThreshold);
	await page.getByRole("button", { name: "Сохранить порог" }).click();
	await expect(page.getByText("Настройки сохранены")).toBeVisible();
	await page.reload();
	await expect(demoThreshold).toHaveValue(changedThreshold);
	expect(api.demoStarts).toBe(1);

	await page.getByRole("link", { name: "Gridly", exact: true }).click();
	const exitDialog = page.getByRole("alertdialog", {
		name: "Предупреждение",
	});
	await expect(exitDialog).toContainText("все изменения в демо будут сброшены");
	await expect(exitDialog.getByRole("button")).toHaveCount(2);
	await exitDialog
		.getByRole("button", { name: "Остаться", exact: true })
		.click();
	await expect(exitDialog).toHaveCount(0);
	await expect(page).toHaveURL(demoSettings);
	await expect(demoThreshold).toHaveValue(changedThreshold);
	expect(api.demoStores.size).toBe(1);

	await page.getByRole("button", { name: "Меню профиля" }).click();
	await page.getByRole("menuitem", { name: "Выйти из демо" }).click();
	const revoked = page.waitForResponse(
		(response) =>
			response.url().endsWith("/demo/session") &&
			response.request().method() === "DELETE",
	);
	await exitDialog.getByRole("button", { name: "Выйти", exact: true }).click();
	expect((await revoked).status()).toBe(204);
	await expect(page).toHaveURL(`${base}/`);
	await page.getByRole("button", { name: "Открыть демо", exact: true }).click();
	await page.waitForURL("**/demo/warehouses/warehouse-demo/map");
	expect(api.demoStarts).toBe(2);
	expect(api.demoStores.size).toBe(1);
	await page.locator('a[href$="/settings"]').click();
	await expect(demoThreshold).toHaveValue(initialThreshold);
	console.log(
		"PASS demo edit survives reload and cancellation, exit starts a fresh scenario",
	);
}
