import { expect } from "@playwright/test";
import type { UiScenario } from "../uiBrowserFixture";

export async function robotScenario({ api, page, ready, signIn }: UiScenario) {
	await signIn();
	await ready("robots");
	const calls = api.mutations;

	await page
		.getByRole("button", { name: "Удалить", exact: true })
		.first()
		.click();
	const confirmation = page.getByRole("alertdialog");
	await expect(confirmation).toBeVisible();

	await confirmation
		.getByRole("button", { name: "Отмена", exact: true })
		.click();
	await expect(confirmation).toHaveCount(0);
	expect(api.mutations).toBe(calls);

	const dialog = page.locator("[data-slot=dialog-popup]");
	await page
		.getByRole("button", { name: "Добавить робота", exact: true })
		.click();
	await dialog.getByLabel("Название *", { exact: true }).fill("UI робот");
	await expect(
		dialog.getByRole("combobox", { name: "Стартовая клетка *", exact: true }),
	).toBeVisible({ timeout: 2000 });
	await dialog
		.getByRole("combobox", { name: "Стартовая клетка *", exact: true })
		.click();
	await page.getByRole("option").first().click();
	const selectedPosition = await dialog
		.locator('input[name="position"]')
		.inputValue();
	await dialog.getByRole("button", { name: "Сохранить", exact: true }).click();
	await expect(dialog.getByRole("alert")).toContainText(
		"Проверьте введённые данные",
	);
	await expect(dialog.locator('input[name="position"]')).toHaveValue(
		selectedPosition,
	);
	await expect(dialog.getByLabel("Название *", { exact: true })).toHaveValue(
		"UI робот",
	);
	api.failRobot = false;
	await dialog.getByRole("button", { name: "Сохранить", exact: true }).click();
	await expect(dialog).toHaveCount(0);
	await expect(page.getByText("UI робот", { exact: true })).toBeVisible();
}
