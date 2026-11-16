import { expect } from "@playwright/test";
import type { UiScenario } from "../uiBrowserFixture";

export async function warehouseDeletionScenario({
	api,
	base,
	page,
	signIn,
}: UiScenario) {
	await signIn();
	await page.goto(`${base}/warehouses/warehouse-demo/settings`);
	const remove = page.getByRole("button", {
		name: "Удалить склад",
		exact: true,
	});
	const confirmation = page.getByRole("alertdialog", {
		name: "Удалить склад?",
	});
	const confirm = confirmation.getByRole("button", { name: "Удалить склад" });
	api.readOnly = true;
	await page.reload();
	await expect(remove).toBeDisabled();
	api.readOnly = false;
	await page.reload();
	await remove.click();
	await expect(confirmation).toContainText("Центральный склад");
	await confirmation.getByRole("button", { name: "Отмена" }).click();
	await expect(confirmation).toHaveCount(0);
	expect(api.mutations).toBe(0);

	await page.route(
		"**/api/v1/warehouses/warehouse-demo",
		async (route) => {
			if (route.request().method() !== "DELETE") return route.fallback();
			await route.fulfill({
				status: 409,
				json: { error: { code: "STALE_REVISION" } },
			});
		},
		{ times: 1 },
	);
	await remove.click();
	await confirm.click();
	await expect(confirmation.getByRole("alert")).toContainText(
		"Объект изменился",
	);
	await confirm.click();
	await expect(page).toHaveURL(`${base}/warehouses/warehouse-north/map`);

	await page.goto(`${base}/admin/shipments?tab=warehouses`);
	const table = page.getByRole("table", { name: "Доступные склады" });
	await expect(table.getByText("Центральный склад")).toHaveCount(0);
	await table
		.getByRole("button", { name: "Удалить склад «Северный склад»" })
		.click();
	await expect(confirmation).toContainText("Северный склад");
	await confirm.click();
	await expect(confirmation).toHaveCount(0);
	await expect(page.getByText("Ничего не найдено")).toBeVisible();
	await page.goto(`${base}/app`);
	await expect(page).toHaveURL(`${base}/warehouses/new/map`);

	await page.goto(`${base}/`);
	await page.getByRole("button", { name: "Открыть песочницу" }).click();
	await expect(page).toHaveURL(`${base}/sandbox/warehouses/warehouse-demo/map`);
	await page.goto(`${base}/sandbox/warehouses/warehouse-demo/settings`);
	await remove.click();
	await confirm.click();
	await expect(page).toHaveURL(
		`${base}/sandbox/warehouses/warehouse-north/map`,
	);
	await page.goto(`${base}/sandbox/warehouses/warehouse-north/settings`);
	await remove.click();
	await confirm.click();
	await expect(page).toHaveURL(`${base}/sandbox/warehouses/new/map`);
	await page.goto(`${base}/sandbox`);
	await expect(page).toHaveURL(`${base}/sandbox/warehouses/new/map`);
}
