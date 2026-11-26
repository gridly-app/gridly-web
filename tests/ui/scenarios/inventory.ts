import { expect } from "@playwright/test";
import type { UiScenario } from "../uiBrowserFixture";

export async function inventoryScenario({ page, ready, signIn }: UiScenario) {
	await signIn();
	const dialog = page.locator("[data-slot=dialog-popup]");
	await ready("inventory");
	const stock = page.getByRole("radio", { name: "На складе", exact: true });
	const incoming = page.getByRole("radio", { name: "Ожидается", exact: true });

	await stock.focus();
	await stock.press("ArrowRight");
	await expect(incoming).toBeChecked();
	await expect(incoming).toBeFocused();
	await incoming.press("ArrowLeft");
	await expect(stock).toBeChecked();
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

	const batch = page
		.getByRole("row")
		.filter({ has: page.getByRole("button", { name: "Списать", exact: true }) })
		.first();
	const amount = batch.getByRole("cell").nth(2);
	const originalAmount = Number(
		(await amount.innerText()).replace(/[^0-9]/g, ""),
	);
	expect(originalAmount).toBeGreaterThan(2);

	await batch.getByRole("button", { name: "Списать", exact: true }).click();
	await expect(dialog).toBeVisible();
	await dialog.getByLabel("Количество *", { exact: true }).fill("2");
	await dialog
		.getByLabel("Причина *", { exact: true })
		.fill("Проверка списания");
	await dialog.getByRole("button", { name: "Подтвердить списание" }).click();
	await expect(dialog).toHaveCount(0);
	await expect(amount).toHaveText(
		`${(originalAmount - 2).toLocaleString("ru-RU")} шт.`,
	);
	await page.getByRole("radio", { name: "Списания", exact: true }).click();
	const logEntry = page
		.getByRole("row")
		.filter({ hasText: "Проверка списания" });
	await expect(logEntry).toHaveCount(1);
	await expect(logEntry).toContainText("2 шт.");
}
