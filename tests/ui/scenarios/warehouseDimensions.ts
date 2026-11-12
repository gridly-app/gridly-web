import { expect } from "@playwright/test";
import type { UiScenario } from "../uiBrowserFixture";

export async function warehouseDimensionsScenario({
	api,
	page,
	ready,
	signIn,
}: UiScenario) {
	await signIn();
	await ready("settings");

	const width = page.getByLabel("Ширина, клеток");
	const height = page.getByLabel("Высота, клеток");
	const save = page.getByRole("button", { name: "Сохранить размеры" });
	const warehouse = api.accountStore.get("/api/v1/warehouses/warehouse-demo");
	if (!warehouse) throw new Error("Missing warehouse metadata fixture");
	await expect(width).toHaveValue("16");
	await expect(height).toHaveValue("11");
	await expect(save).toBeDisabled();

	Object.assign(warehouse, { width: 18, height: 12, published_version: 2 });
	await expect(width).toHaveValue("18", { timeout: 12_000 });
	await expect(height).toHaveValue("12");
	await expect(save).toBeDisabled();

	await width.fill("20");
	Object.assign(warehouse, { width: 19, height: 13, published_version: 3 });
	await expect(height).toHaveValue("13", { timeout: 12_000 });
	await expect(width).toHaveValue("20");
	await expect(save).toBeEnabled();
	await page
		.getByRole("button", { name: "Вернуть сохранённые размеры" })
		.click();
	await expect(width).toHaveValue("19");
	await expect(height).toHaveValue("13");
	await expect(save).toBeDisabled();
}
