import { expect } from "@playwright/test";
import type { UiScenario } from "../uiBrowserFixture";

export async function mapEditorScenario({
	page,
	ready,
	screenshot,
	signIn,
}: UiScenario) {
	await signIn();
	await ready("map");
	await page
		.getByRole("button", { name: "Режим просмотра", exact: true })
		.click();
	await page
		.getByRole("button", { name: "Редактирование", exact: true })
		.click();
	await page
		.getByRole("menuitem", { name: "Строительство", exact: true })
		.click();
	await expect(
		page.getByRole("button", { name: "Сохранить изменения", exact: true }),
	).toBeVisible();
	await expect(
		page.getByRole("button", { name: "Следующие категории" }),
	).toHaveCount(0);
	await screenshot("editor-construction");
	const editCanvas = page.locator("canvas").first();
	await editCanvas.focus();
	await page.keyboard.press("ArrowRight");
	await page.keyboard.press("Enter");
	await page.getByRole("button", { name: "Стена", exact: true }).click();
	const undo = page.getByRole("button", { name: "Отменить", exact: true });
	const redo = page.getByRole("button", {
		name: "Вернуть отменённое",
		exact: true,
	});
	await expect(undo).toBeEnabled();
	await undo.click();
	await expect(redo).toBeEnabled();
	await redo.click();
	await expect(undo).toBeEnabled();
	await undo.click();
	await page
		.getByRole("button", { name: "Сохранить изменения", exact: true })
		.click();
	await expect(
		page.getByRole("button", { name: "Сохранить изменения", exact: true }),
	).toHaveCount(0);
	await page
		.getByRole("button", { name: "Редактирование", exact: true })
		.click();
	await page
		.getByRole("menuitem", { name: "Настройка путей", exact: true })
		.click();
	await screenshot("editor-routes");
	await page.keyboard.press("Escape");
	console.log("PASS map save and editor exceptions");
}
