import { expect } from "@playwright/test";

import type { UiScenario } from "../uiBrowserFixture";
import { shipmentExample } from "./shipmentExamples";

export async function checkGuestShipment({
	page,
	base,
}: Pick<UiScenario, "page" | "base">) {
	const guest = shipmentExample("Снимок отгрузки");
	let status = 200;
	const errors = { error: { code: "TEST", message: "Тестовая ошибка" } };
	await page.route("**/api/v1/public/shipments", async (route) => {
		expect(route.request().headers().authorization).toBe(
			"Bearer bruno-shipment-guest-token",
		);
		expect(route.request().headers().cookie).toBeUndefined();
		await route.fulfill({ status, json: status === 200 ? guest : errors });
	});
	await page.route("**/api/v1/public/shipments/documents/**", async (route) => {
		expect(route.request().headers().authorization).toBe(
			"Bearer bruno-shipment-guest-token",
		);
		await route.fulfill({
			body: "sample",
			headers: {
				"Content-Type": "text/plain",
				"Content-Disposition": "attachment; filename=sample.txt",
			},
		});
	});
	await page.setViewportSize({ width: 390, height: 820 });
	await page.goto(`${base}/shipments#token=bruno-shipment-guest-token`);
	await expect(
		page.getByRole("heading", { name: "Заказ ЗК-2087" }),
	).toBeVisible();
	await expect(page.locator('[aria-current="step"]')).toContainText(
		"Передан перевозчику",
	);
	expect(
		await page.evaluate(() => document.documentElement.scrollWidth),
	).toBeLessThanOrEqual(390);
	await page.getByRole("combobox", { name: "Группировка" }).click();
	await page.getByRole("option", { name: "По неделям" }).click();
	await page
		.getByRole("button", { name: "Факт за 2026-11-09, шт." })
		.press("Enter");
	await expect(page.getByRole("dialog")).toContainText("52743106");
	await expect(page.getByRole("dialog")).toContainText("А123ВС 77");
	await page
		.getByRole("dialog")
		.getByRole("button", { name: "Закрыть", exact: true })
		.click();
	await expect(page.getByRole("dialog")).toHaveCount(0);
	const [csv] = await Promise.all([
		page.waitForEvent("download"),
		page.getByRole("button", { name: "Скачать CSV" }).click(),
	]);
	expect(csv.suggestedFilename()).toBe("gridly-shipments.csv");
	const [file] = await Promise.all([
		page.waitForEvent("download"),
		page.getByRole("button", { name: "Скачать Накладная" }).click(),
	]);
	expect(file.suggestedFilename()).toBe("sample.txt");
	status = 503;
	await page.getByRole("button", { name: "Обновить" }).click();
	await expect(page.getByText("Данные могли устареть")).toBeVisible();
	await expect(
		page.getByRole("heading", { name: "Заказ ЗК-2087" }),
	).toBeVisible();
	status = 404;
	await page.getByRole("button", { name: "Повторить" }).click();
	await expect(page.getByText("Заказ недоступен")).toBeVisible();
	await expect(
		page.getByRole("heading", { name: "Заказ ЗК-2087" }),
	).toHaveCount(0);
}
