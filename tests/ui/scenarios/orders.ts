import { expect } from "@playwright/test";
import type { UiScenario } from "../uiBrowserFixture";

export async function ordersScenario({ page, ready, signIn }: UiScenario) {
	await signIn();
	const dialog = page.locator("[data-slot=dialog-popup]");
	await ready("inbound");
	await page
		.getByRole("button", { name: /^Состав заказа/ })
		.first()
		.click();
	const expandedLines = page.getByRole("region", { name: "Состав заказа" });
	await expect(
		expandedLines.getByRole("columnheader", { name: "Обработано" }),
	).toBeVisible();
	await expect(
		expandedLines.getByRole("link", { name: "Партии товара" }).first(),
	).toBeVisible();

	await expandedLines
		.getByRole("link", { name: "Партии товара" })
		.first()
		.click();
	await expect(page).toHaveURL(/inventory\?product=prod-coffee/);
	await expect(page.getByText(/^Товар: /)).toHaveCount(0);
	await page.getByRole("button", { name: "Фильтры, активно: 1" }).click();
	await expect(
		page.getByRole("combobox", { name: "Товар", exact: true }),
	).toContainText("Кофе в зёрнах");

	await ready("inbound");
	await page.getByRole("button", { name: "Столбцы", exact: true }).click();
	const supplierColumn = page.getByRole("menuitemcheckbox", {
		name: "Поставщик",
		exact: true,
	});
	await supplierColumn.click();
	await expect(
		page.getByRole("columnheader", { name: "Поставщик", exact: true }),
	).toHaveCount(0);
	await supplierColumn.click();
	await page.keyboard.press("Escape");
	await page.getByRole("button", { name: "Поставка", exact: true }).click();
	await expect(dialog).toBeVisible();
	await dialog.getByLabel("Поставщик *", { exact: true }).fill("UI поставщик");
	await dialog.getByRole("combobox").first().click();
	await page.getByRole("option", { name: /Кофе/ }).click();
	await dialog.getByRole("button", { name: "Создать черновик" }).click();
	await expect(dialog.getByRole("alert")).toContainText(
		"Проверьте введённые данные",
	);
	await dialog.getByRole("button", { name: "Закрыть", exact: true }).click();
	await expect(
		page.getByRole("heading", { name: "Сохранить незавершённую форму?" }),
	).toBeVisible();
	await page
		.getByRole("button", { name: "Сохранить форму", exact: true })
		.click();
	console.log("PASS order draft and API error");
}
