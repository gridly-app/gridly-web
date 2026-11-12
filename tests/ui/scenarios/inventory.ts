import { expect } from "@playwright/test";
import type { UiScenario } from "../uiBrowserFixture";

export async function inventoryScenario({ page, ready, signIn }: UiScenario) {
	await signIn();
	const dialog = page.locator("[data-slot=dialog-popup]");
	await ready("inventory");
	await page
		.getByRole("button", { name: /^Партии:/ })
		.first()
		.click();
	await page
		.getByRole("button", { name: "Связи товара", exact: true })
		.first()
		.click();
	await expect(
		page.getByRole("menuitem", { name: "Товар в каталоге" }),
	).toBeVisible();
	await page.keyboard.press("Escape");
	await expect(
		page.getByRole("button", { name: "Изменить количество", exact: true }),
	).toHaveCount(0);
	await expect(
		page.getByRole("button", { name: "Корректировать партию", exact: true }),
	).toHaveCount(0);
	await expect(
		page.getByRole("button", { name: "Партия", exact: true }),
	).toHaveCount(0);
	console.log("PASS grouped inventory without direct mutation controls");

	await page
		.getByRole("button", { name: "Списать", exact: true })
		.first()
		.click();
	await expect(dialog).toBeVisible();
	await dialog
		.getByLabel("Причина *", { exact: true })
		.fill("Проверка списания");
	await dialog.getByRole("button", { name: "Подтвердить списание" }).click();
	await expect(dialog).toHaveCount(0);
	console.log("PASS write-off");
}
