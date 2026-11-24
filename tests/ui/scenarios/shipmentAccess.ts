import { expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { shipmentSchema } from "../../../src/domain/shipment";
import { loadMockRoutes } from "../../../bruno/mock-fixture";
import type { UiScenario } from "../uiBrowserFixture";

export async function shipmentAccessScenario({ page, base }: UiScenario) {
	const routes = await loadMockRoutes();
	const sample = routes.find((route) => route.name === "Снимок отгрузки")
		?.response.body?.data;

	if (!sample) throw new Error("Missing shipment fixture");

	const shipment = shipmentSchema.parse(JSON.parse(sample));
	const access = {
		...shipment,
		id: "calendar-only",
		sections: ["calendar"],
		items: shipment.items.map((item) => ({ ...item, grade: "Скрытая марка" })),
		calendar_items: shipment.items.map(({ order_line_id, name, sku }) => ({
			order_line_id,
			name,
			sku,
		})),
	};
	const fact = shipment.actual[0];
	const item = shipment.items.find(
		(item) => item.order_line_id === fact?.order_line_id,
	);

	if (!item) throw new Error("Missing calendar item fixture");

	const otherItem = shipment.items.find(
		(other) => other.order_line_id !== item.order_line_id,
	);
	access.calendar_items = access.calendar_items.map((entry) => ({
		...entry,
		order_line_id:
			entry.order_line_id === item.order_line_id ? "all" : entry.order_line_id,
	}));
	access.plan = access.plan.map((entry) => ({
		...entry,
		order_line_id:
			entry.order_line_id === item.order_line_id ? "all" : entry.order_line_id,
	}));
	access.actual = access.actual.map((entry) => ({
		...entry,
		order_line_id:
			entry.order_line_id === item.order_line_id ? "all" : entry.order_line_id,
	}));
	access.plan.push({
		date: "2026-11-15",
		order_line_id: "all",
		quantity: 5,
		unit: "pallet",
	});

	await page.route("**/api/v1/public/shipments", (route) =>
		route.fulfill({ json: { orders: [access] } }),
	);
	await page.goto(`${base}/shipments#token=calendar-only`);
	await expect(
		page.getByRole("table", { name: "Таблица плана и факта" }),
	).toContainText(item.name);
	await page
		.getByRole("button", { name: /^Факт за/ })
		.first()
		.click();
	await expect(page.getByRole("dialog")).toContainText(item.name);
	await expect(page.getByRole("dialog")).toContainText(item.sku);
	await expect(page.getByRole("dialog")).not.toContainText("Скрытая марка");
	await page.keyboard.press("Escape");
	await page
		.getByRole("button", { name: /^Весь факт/ })
		.first()
		.click();
	await expect(page.getByRole("dialog")).toContainText(item.name);
	await expect(page.getByRole("dialog")).not.toContainText("Скрытая марка");
	await page.keyboard.press("Escape");
	const table = page.getByRole("table", { name: "Таблица плана и факта" });
	await page
		.getByRole("checkbox", { name: "Показывать ноль при отсутствии факта" })
		.uncheck();
	await expect(table).toContainText("Нет отгрузки");
	await expect(
		page.getByRole("list", { name: "Итоги по единицам" }),
	).toContainText("Нет отгрузки");
	await table
		.getByRole("columnheader", { name: "Статус" })
		.getByRole("button")
		.click();
	await page.getByText("Колонки", { exact: true }).click();
	await page.getByRole("checkbox", { name: "Статус", exact: true }).uncheck();
	await expect(table.getByRole("columnheader", { name: "Статус" })).toHaveCount(
		0,
	);
	await expect(table.getByRole("columnheader").first()).toHaveAttribute(
		"aria-sort",
		"ascending",
	);
	const [download] = await Promise.all([
		page.waitForEvent("download"),
		page.getByRole("button", { name: "Скачать CSV" }).click(),
	]);
	const path = await download.path();

	if (!path) throw new Error("Missing CSV download");

	const csv = await readFile(path, "utf8");

	expect(csv).toContain(item.name);
	expect(csv).not.toContain("Статус");
	expect(csv).not.toContain("Приоритет");
	expect(csv).not.toContain("Скрытая марка");
	await page
		.getByRole("combobox", { name: "Номенклатура", exact: true })
		.click();
	await page
		.getByRole("option", { name: `${item.sku} · ${item.name}`, exact: true })
		.click();

	if (!otherItem) throw new Error("Missing second calendar item fixture");

	await expect(table).not.toContainText(otherItem.name);
	await page
		.getByRole("combobox", { name: "Группировка", exact: true })
		.click();
	await page.getByRole("option", { name: "По неделям", exact: true }).click();
	await expect(table.getByRole("columnheader").first()).toHaveAccessibleName(
		"Неделя с",
	);
	const [weeklyDownload] = await Promise.all([
		page.waitForEvent("download"),
		page.getByRole("button", { name: "Скачать CSV" }).click(),
	]);
	const weeklyPath = await weeklyDownload.path();

	if (!weeklyPath) throw new Error("Missing weekly CSV download");

	const weeklyCsv = await readFile(weeklyPath, "utf8");

	expect(weeklyCsv.split("\n")[0]).toContain("Неделя с");
}
