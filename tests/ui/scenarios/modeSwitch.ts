import { expect } from "@playwright/test";
import type { UiScenario } from "../uiBrowserFixture";

export async function modeSwitchScenario({ page, signIn }: UiScenario) {
	await signIn();
	await page
		.getByRole("button", { name: "Режим просмотра", exact: true })
		.click();
	await page
		.getByRole("button", { name: "Редактирование", exact: true })
		.click();
	await page
		.getByRole("menuitem", { name: "Строительство", exact: true })
		.click();

	const map = page.getByLabel(/^Карта склада\. Стрелки/);
	await map.press("ArrowRight");
	await map.press("Enter");
	await page.getByRole("button", { name: "Стена", exact: true }).click();
	await page.route(
		"**/warehouses/warehouse-demo/layout/commit",
		(route) => route.abort("failed"),
		{ times: 1 },
	);
	await page
		.getByRole("button", { name: "Сохранить изменения", exact: true })
		.click();

	const unknown = page.getByText(/Исход записи планировки неизвестен/);
	await expect(unknown).toBeVisible();
	await page
		.getByRole("button", { name: "Выйти из просмотра", exact: true })
		.click();
	await page.getByRole("link", { name: "Gridly", exact: true }).click();
	await page
		.getByRole("button", { name: "Открыть песочницу", exact: true })
		.click();
	await page.waitForURL("**/sandbox/warehouses/warehouse-demo/map");

	await page.getByRole("button", { name: "Меню профиля" }).click();
	await page.getByRole("menuitem", { name: "Мои склады", exact: true }).click();
	await page
		.getByRole("alertdialog", { name: "Предупреждение" })
		.getByRole("button", { name: "Выйти", exact: true })
		.click();
	await page.waitForURL("**/warehouses/warehouse-demo/map");
	await expect(page.locator("[data-map-workspace]")).toBeVisible();
	await expect(unknown).toHaveCount(0);
}
