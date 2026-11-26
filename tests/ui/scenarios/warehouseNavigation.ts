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
	await ready("map");
	await page.reload();
	await expect(page).toHaveURL(`${base}/warehouses/warehouse-demo/map`);
	await expect(page.locator("canvas").first()).toBeVisible();

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
	const sidebarTrigger = page.getByRole("button", {
		name: "Переключить меню",
		exact: true,
	});
	await sidebarTrigger.click();
	await expect(sidebarTrigger).toHaveAttribute("aria-expanded", "false");
	const navCatalog = page.getByRole("link", { name: "Каталог", exact: true });
	await navCatalog.click();
	await expect(navCatalog).toHaveAttribute("aria-current", "page");
	await expect(
		page.getByRole("button", { name: "Меню профиля" }),
	).toBeVisible();

	await sidebarTrigger.click();
	await expect(sidebarTrigger).toHaveAttribute("aria-expanded", "true");
}
