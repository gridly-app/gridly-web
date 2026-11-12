import { expect } from "@playwright/test";
import type { UiScenario } from "../uiBrowserFixture";

export async function catalogScenario({
	api,
	page,
	ready,
	signIn,
}: UiScenario) {
	await signIn();
	await ready("catalog");
	await page.getByRole("textbox", { name: "Поиск по каталогу" }).fill("Кофе");
	await expect(page.locator("tbody tr")).toHaveCount(1);
	await page
		.getByRole("textbox", { name: "Поиск по каталогу" })
		.fill("no-matching-product");
	await expect(
		page.getByText("Ничего не найдено. Измените поиск.", { exact: true }),
	).toBeVisible();
	await page.getByRole("textbox", { name: "Поиск по каталогу" }).fill("");
	await page.getByRole("radio", { name: "Товары", exact: true }).focus();
	await page.keyboard.press("ArrowRight");
	await expect(
		page.getByRole("radio", { name: "Категории", exact: true }),
	).toBeChecked();
	await page.getByRole("button", { name: "Продукты", exact: true }).click();
	const categoryCard = page.getByRole("dialog", {
		name: "Продукты",
		exact: true,
	});
	await expect(
		categoryCard.getByRole("link", { name: "Поставки" }),
	).toHaveAttribute("href", /inbound\?category=cat-food/);
	await expect(
		categoryCard.getByRole("link", { name: "Отгрузки" }),
	).toHaveAttribute("href", /outbound\?category=cat-food/);
	await expect(
		categoryCard.getByRole("heading", { name: "Правила хранения" }),
	).toBeVisible();
	const limit = categoryCard
		.getByRole("spinbutton", {
			name: "Лимит на клетку, м³ · Продукты",
			exact: true,
		})
		.first();
	await limit.fill("25");
	await categoryCard
		.getByRole("textbox", { name: "Поиск по зонам хранения" })
		.fill("no-matching-zone");
	await expect(limit).toBeHidden();
	const savedRules = page.waitForRequest(
		(request) =>
			request.url().endsWith("/layout/commit") && request.method() === "POST",
	);
	await categoryCard
		.getByRole("button", { name: "Сохранить правила хранения" })
		.click();
	expect((await savedRules).postDataJSON().cells).toContainEqual(
		expect.objectContaining({
			x: 2,
			y: 2,
			capacity_volume: 25,
			zone: expect.objectContaining({
				id: "zone-cat-food-left",
				category_id: "cat-food",
			}),
		}),
	);
	await categoryCard.getByRole("link", { name: "Остатки" }).click();
	await expect(page).toHaveURL(/inventory\?category=cat-food/);
	await expect(
		page.getByRole("button", { name: "Фильтры, активно: 1" }),
	).toBeVisible();
	await ready("catalog");
	await page.getByRole("button", { name: "Фильтры", exact: true }).click();
	await page
		.getByRole("combobox", { name: "Статус каталога", exact: true })
		.click();
	await page.getByRole("option", { name: "Активные", exact: true }).hover();
	await expect(
		page.locator("[data-slot=glide-select-highlight]"),
	).toBeVisible();
	await expect
		.poll(() =>
			page.locator('[data-slot="select-list"]').evaluate((root) => {
				const pill = root
					.querySelector("[data-slot=glide-select-highlight]")
					?.getBoundingClientRect();
				const item = Array.from(root.querySelectorAll('[role="option"]'))
					.find((option) => option.textContent?.trim() === "Активные")
					?.getBoundingClientRect();
				return pill && item ? Math.abs(pill.y - item.y) : Infinity;
			}),
		)
		.toBeLessThan(2);
	await page.getByRole("option", { name: "Активные", exact: true }).click();
	await expect(
		page.getByRole("combobox", { name: "Статус каталога", exact: true }),
	).toContainText("Активные");
	await page.keyboard.press("Escape");
	await page.getByRole("link", { name: "Кофе в зёрнах", exact: true }).click();
	const productCard = page.getByRole("dialog", { name: "Кофе в зёрнах" });
	await expect(productCard.getByRole("table")).toBeVisible();
	await productCard.getByRole("radio", { name: /^Заказы/ }).click();
	await productCard.getByRole("link", { name: "ПР-1042", exact: true }).click();
	const orderCard = page.getByRole("dialog", { name: "Карточка заказа" });
	const lines = orderCard.getByRole("region", { name: "Состав заказа" });
	await lines
		.getByRole("textbox", { name: "Поиск по составу заказа" })
		.fill("FOOD-001");
	await expect(lines.locator("tbody tr")).toHaveCount(1);
	await lines.getByRole("link", { name: "Кофе в зёрнах", exact: true }).click();
	await expect(productCard).toBeVisible();
	await productCard
		.getByRole("button", { name: "Изменить товар", exact: true })
		.click();
	await expect(
		page.getByRole("dialog", { name: "Редактирование товара" }),
	).toBeVisible();
	await page.keyboard.press("Escape");
	await page.getByRole("link", { name: "Паста ригатони", exact: true }).click();
	const pastaCard = page.getByRole("dialog", { name: "Паста ригатони" });
	await pastaCard.getByRole("radio", { name: "Движения", exact: true }).click();
	await expect(
		pastaCard.getByRole("table", { name: "Движения товара" }),
	).toBeVisible();
	await expect(
		pastaCard.getByRole("link", { name: "ЗК-2079", exact: true }),
	).toBeVisible();
	await page.keyboard.press("Escape");
	console.log("PASS linked product and order cards");
	await page.getByRole("button", { name: "Столбцы", exact: true }).click();
	await page
		.getByRole("menuitemcheckbox", { name: "Артикул", exact: true })
		.click();
	await expect(page.getByRole("columnheader", { name: "Артикул" })).toHaveCount(
		0,
	);
	await page
		.getByRole("menuitemcheckbox", { name: "Артикул", exact: true })
		.click();
	await page.keyboard.press("Escape");
	const priceHeader = page.getByRole("columnheader", { name: "Цена" });
	await priceHeader.getByRole("button").click();
	await expect(priceHeader).toHaveAttribute("aria-sort", "ascending");

	const create = page.getByRole("button", { name: "Товар", exact: true });
	await create.click();
	const dialog = page.locator("[data-slot=dialog-popup]");
	await expect(dialog).toBeVisible();
	for (let step = 0; step < 14; step++) {
		await page.keyboard.press("Tab");
		await expect
			.poll(() => dialog.evaluate((el) => el.contains(document.activeElement)))
			.toBe(true);
	}
	await dialog.getByLabel("Название *", { exact: true }).fill("UI тест товара");
	await dialog.getByLabel("Артикул *", { exact: true }).fill("UI-001");
	expect(
		await dialog.getByRole("combobox").evaluate((element) => element.tagName),
	).toBe("BUTTON");
	await dialog.getByRole("combobox").click();
	await page.getByRole("option", { name: "Продукты", exact: true }).click();
	api.failProduct = true;
	const save = dialog.getByRole("button", { name: "Сохранить", exact: true });
	await save.click();
	const productError = dialog.getByRole("alert");
	await expect(productError).toContainText("Проверьте введённые данные");
	await expect(productError).not.toContainText(
		/Тестовая ошибка сохранения товара|internal_revision|driver stack/,
	);
	const before = api.mutations;
	api.failProduct = false;
	await save.evaluate((element: HTMLButtonElement) => {
		element.click();
		element.click();
	});
	await expect(dialog).toHaveCount(0);
	expect(api.mutations - before).toBe(1);
	await expect(page.getByText("UI тест товара", { exact: true })).toBeVisible();
	await expect(create).toBeFocused();
	await create.click();
	await page.keyboard.press("Escape");
	await expect(dialog).toHaveCount(0);
	await expect(create).toBeFocused();
	console.log("PASS forms, combobox, keyboard, failed save and retry");
}
