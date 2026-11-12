import { expect } from "@playwright/test";
import type { UiScenario } from "../uiBrowserFixture";

export async function warehouseNavigationScenario({
	base,
	page,
	ready,
	screenshot,
	signIn,
}: UiScenario) {
	await signIn();
	const warehouseSelector = page.getByRole("combobox", {
		name: "Рабочее пространство — выбор склада",
		exact: true,
	});
	await expect(warehouseSelector).toBeVisible();
	expect(
		await warehouseSelector.evaluate((trigger) => {
			const parent = trigger.parentElement;
			return parent
				? Math.abs(trigger.getBoundingClientRect().width - parent.clientWidth)
				: Infinity;
		}),
	).toBeLessThan(1);
	await page.goto(`${base}/warehouses/warehouse-demo/warehouses`);
	await page.getByRole("combobox", { name: "Категория отчёта" }).click();
	await expect(
		page.getByRole("option", { name: "Продукты", exact: true }),
	).toBeVisible();

	for (const path of [
		"map",
		"catalog",
		"robots",
		"inbound",
		"outbound",
		"inventory",
		"history",
		"information",
		"settings",
	]) {
		await ready(path);
		await expect(page.locator("input[role=combobox]")).toHaveCount(0);
		await expect(page.locator("[title]")).toHaveCount(0);
		if (path === "history") {
			await expect(
				page.getByText("Склад создан", { exact: true }),
			).toBeVisible();
			await expect(
				page.getByText("Склад готов к работе", { exact: true }),
			).toHaveCount(0);
		}
		if (path === "information") {
			const metrics = page.getByRole("region", {
				name: "Основные показатели склада",
				exact: true,
			});
			await expect(metrics.locator("[data-metric]")).toHaveCount(4);
			await expect(metrics.locator('[data-tone="active"]')).toContainText(
				"В работе",
			);
			await expect(metrics.locator('[data-tone="reserved"]')).toContainText(
				"В резерве",
			);
		}
		if (path === "inventory") {
			await expect(
				page.getByRole("radio", { name: "На складе", exact: true }),
			).toBeChecked();
			await expect(
				page.getByRole("radio", { name: "Ожидается", exact: true }),
			).toBeVisible();
			await expect(
				page.getByRole("radio", { name: "Списания", exact: true }),
			).toBeVisible();
			await page.getByRole("radio", { name: "Ожидается", exact: true }).click();
			await page.getByRole("button", { name: "Фильтры", exact: true }).click();
			await expect(
				page.getByRole("combobox", {
					name: "Категория остатков",
					exact: true,
				}),
			).toBeVisible();
			await page.getByRole("radio", { name: "На складе", exact: true }).click();
		}
		await screenshot(path);
	}
	console.log("PASS all warehouse screens");
	const sidebarTrigger = page.getByRole("button", {
		name: "Переключить меню",
		exact: true,
	});
	await sidebarTrigger.click();
	await expect(sidebarTrigger).toHaveAttribute("aria-expanded", "false");
	await expect(
		page.getByRole("link", { name: "Каталог", exact: true }),
	).toBeVisible();
	const navCatalog = page.getByRole("link", { name: "Каталог", exact: true });
	await page.emulateMedia({ reducedMotion: "no-preference" });
	await navCatalog.click();
	const railSelection = navCatalog.locator("[data-rail-selection]");
	await expect(railSelection).toBeVisible();
	await expect
		.poll(async () => {
			const link = await navCatalog.boundingBox();
			const highlight = await railSelection.boundingBox();
			return link && highlight ? Math.abs(link.y - highlight.y) : Infinity;
		})
		.toBeLessThan(1);
	await page.emulateMedia({ reducedMotion: "reduce" });
	const profile = page.getByRole("button", { name: "Меню профиля" });
	await expect(
		page.locator('[data-collapsible="icon"] [data-slot="separator"]'),
	).toBeVisible();
	await expect
		.poll(async () => {
			const avatar = await profile
				.locator('[data-slot="avatar"]')
				.first()
				.boundingBox();
			const link = await navCatalog.boundingBox();
			return avatar && link
				? Math.abs(avatar.x + avatar.width / 2 - link.x - link.width / 2)
				: Infinity;
		})
		.toBeLessThan(2);

	await sidebarTrigger.click();
	await expect(sidebarTrigger).toHaveAttribute("aria-expanded", "true");
}
