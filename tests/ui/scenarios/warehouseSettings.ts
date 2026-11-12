import { expect } from "@playwright/test";
import type { UiScenario } from "../uiBrowserFixture";

export async function warehouseSettingsScenario({
	api,
	page,
	ready,
	signIn,
}: UiScenario) {
	await signIn();
	const dialog = page.locator("[data-slot=dialog-popup]");
	await ready("settings");
	await expect(
		page.getByRole("combobox", { name: "Правило размещения", exact: true }),
	).toHaveCount(0);
	await expect(
		page.getByLabel("Порядок отбора партий", { exact: true }),
	).toHaveValue("FEFO — ближайший срок годности");
	const threshold = page.getByLabel("Порог низкого остатка, шт.", {
		exact: true,
	});
	await expect(threshold).toBeEnabled();
	const previousThreshold = await threshold.inputValue();
	await threshold.fill("17");
	api.settingsFailure = 409;
	await page
		.getByRole("button", { name: "Сохранить порог", exact: true })
		.click();
	await expect(page.getByRole("alert")).toContainText("Объект изменился");
	await expect(threshold).toHaveValue("17");
	api.settingsFailure = 0;
	await page
		.getByRole("button", { name: "Сохранить порог", exact: true })
		.click();
	await expect(
		page.getByText("Настройки сохранены", { exact: true }),
	).toBeVisible();
	await page.reload();
	await expect(threshold).toHaveValue("17");
	expect(previousThreshold).not.toBe("17");
	const city = page.getByRole("combobox", { name: "Город", exact: true });
	const chooseKazan = async () => {
		await city.click();
		await page.getByRole("textbox", { name: "Поиск города" }).fill("Казань");
		await page.getByRole("option", { name: "Казань", exact: true }).click();
	};
	const saveCity = page.getByRole("button", { name: "Сохранить город" });
	await chooseKazan();
	const settings = api.accountStore.get(
		"/api/v1/warehouses/warehouse-demo/settings",
	) as { revision: number };
	settings.revision++;
	api.settingsFailure = 409;
	await saveCity.click();
	await expect(page.getByRole("alert")).toContainText("Объект изменился");
	api.settingsFailure = 0;
	await page.getByRole("button", { name: "Вернуть сохранённый город" }).click();
	await chooseKazan();
	await saveCity.click();
	await expect(page.getByText("Сохранено", { exact: true })).toBeVisible();
	await page.reload();
	await expect(city).toHaveText("Казань");
	console.log("PASS city settings recover from a stale revision");
	api.settingsFailure = 404;
	await page.reload();
	await expect(page.getByRole("alert")).toContainText(
		"Не удалось загрузить настройки города и порога остатка",
	);
	await expect(threshold).toBeDisabled();
	await expect(
		page.getByRole("textbox", { name: "Название склада", exact: true }),
	).toBeEnabled();
	api.settingsFailure = 0;
	await page.getByRole("button", { name: "Повторить", exact: true }).click();
	await expect(threshold).toBeEnabled();
	await expect(threshold).toHaveValue("17");
	console.log(
		"PASS FEFO and settings persistence / revision conflict / missing API",
	);
	const setting = page.getByRole("switch").first();
	const previousChecked = await setting.isChecked();
	await setting.click();
	expect(await setting.isChecked()).toBe(!previousChecked);
	await expect(
		page.getByRole("button", {
			name: "Сохранить подтверждения",
			exact: true,
		}),
	).toBeEnabled();
	await page
		.getByRole("combobox", {
			name: "Рабочее пространство — выбор склада",
			exact: true,
		})
		.click();
	await page
		.getByRole("option", { name: "+ Создать склад", exact: true })
		.click();
	await expect(dialog).toBeVisible();
	await dialog.getByLabel("Название *", { exact: true }).fill("UI склад");
	await dialog.getByRole("button", { name: "Сохранить", exact: true }).click();
	await expect(dialog.getByRole("alert")).toContainText(
		"Проверьте введённые данные",
	);
	await page.keyboard.press("Escape");
	console.log("PASS switch and warehouse creation error");
}
