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
		.getByRole("button", { name: "Выйти из просмотра", exact: true })
		.click();
	const historyLink = page.getByRole("link", { name: "История", exact: true });
	await historyLink.click();
	const leave = page.getByRole("alertdialog", { name: "Покинуть карту?" });
	await expect(leave).toBeVisible();
	await leave.getByRole("button", { name: "Остаться", exact: true }).click();
	await expect(page).toHaveURL(/\/map$/);
	await page
		.getByRole("button", { name: "Режим просмотра", exact: true })
		.click();
	await expect(redo).toBeEnabled();
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
	const send = Promise.withResolvers<void>();
	const release = Promise.withResolvers<void>();
	const commit = "**/warehouses/warehouse-demo/layout/commit";
	await page.route(
		commit,
		(route) =>
			route.fulfill({
				status: 422,
				json: {
					error: {
						message: "Планировка не прошла проверку",
						details: {
							violations: [
								{ cell: { x: 1, y: 1 }, message: "Перекрыт проезд" },
							],
						},
					},
				},
			}),
		{ times: 1 },
	);
	const save = page.getByRole("button", {
		name: "Сохранить изменения",
		exact: true,
	});
	await save.click();
	await page
		.getByRole("button", { name: /Клетка 1,1.*Перекрыт проезд/ })
		.click();
	await expect(
		page.locator("aside").getByText("Перекрыт проезд", { exact: true }),
	).toBeVisible();
	await expect(save).toBeEnabled();
	await page.route(
		commit,
		async (route) => {
			send.resolve();
			await release.promise;
			await route.abort("failed");
		},
		{ times: 1 },
	);

	try {
		await page
			.getByRole("button", { name: "Сохранить изменения", exact: true })
			.click();
		await send.promise;
		await page
			.getByRole("button", { name: "Выйти из просмотра", exact: true })
			.click();
		await historyLink.click();
		await expect(page).toHaveURL(/\/history$/);
	} finally {
		release.resolve();
	}

	await page.getByRole("link", { name: "Карта склада", exact: true }).click();
	await expect(
		page.getByText(/Исход записи планировки неизвестен/),
	).toBeVisible();
	await expect(
		page.getByRole("button", { name: "Сохранить изменения", exact: true }),
	).toBeDisabled();
}
