import { expect } from "@playwright/test";
import type { UiScenario } from "../uiBrowserFixture";

export async function warehouseReportScenario({
	page,
	ready,
	signIn,
}: UiScenario) {
	await signIn();
	await ready("information");
	await expect(
		page.getByRole("region", { name: "Динамика поставок и отгрузок" }),
	).toBeVisible();
	await expect(
		page.getByRole("region", { name: "Распределение статусов заказов" }),
	).toBeVisible();
	await expect(
		page.getByRole("region", {
			name: "Доступные и зарезервированные остатки",
		}),
	).toBeVisible();
	await expect(
		page.getByRole("region", { name: "Остатки по категориям" }),
	).toBeVisible();
	const download = page.waitForEvent("download");
	await page.getByRole("button", { name: "Выгрузить CSV" }).click();
	expect((await download).suggestedFilename()).toContain(
		"gridly-warehouse-demo-",
	);
	await page
		.locator("summary")
		.filter({ hasText: "Период и дополнительные фильтры" })
		.click();
	await page.getByLabel("С", { exact: true }).fill("2025-01-01");
	await page.getByLabel("По", { exact: true }).fill("2025-01-02");

	await expect(
		page.getByText("Нет операций за выбранный период.", { exact: true }),
	).toBeVisible();
	console.log("PASS analytics charts, empty periods and CSV");
}
