import { expect } from "@playwright/test";
import { setPageHidden, type UiScenario } from "../uiBrowserFixture";

export async function mapSessionScenario({
	page,
	signIn,
	testServer,
}: UiScenario) {
	await signIn();
	await expect.poll(() => testServer.activeStreamCount).toBe(1);

	await page
		.getByRole("button", { name: "Режим просмотра", exact: true })
		.click();
	await page
		.getByRole("button", { name: "Редактирование", exact: true })
		.click();
	await page
		.getByRole("menuitem", { name: "Строительство", exact: true })
		.click();

	const canvas = page.getByLabel(/^Карта склада\. Стрелки/);
	await canvas.press("ArrowRight");
	await canvas.press("Enter");
	await page.getByRole("button", { name: "Стена", exact: true }).click();

	const undo = page.getByRole("button", { name: "Отменить", exact: true });
	await expect(undo).toBeEnabled();

	await setPageHidden(page, true);
	await expect.poll(() => testServer.activeStreamCount).toBe(0);

	const stream = "**/api/v1/warehouses/warehouse-demo/stream?*";
	await page.route(stream, (route) => route.fulfill({ status: 401 }), {
		times: 1,
	});
	await page.route(
		"**/api/v1/auth/refresh",
		(route) =>
			route.fulfill({
				json: {
					access_token: "refreshed-account-token",
					user: { login: "admin@gridly.local" },
				},
			}),
		{ times: 1 },
	);

	const reconnected = page.waitForRequest(
		(request) =>
			new URL(request.url()).pathname.endsWith("/warehouse-demo/stream") &&
			request.headers().authorization === "Bearer refreshed-account-token",
	);

	await setPageHidden(page, false);
	await reconnected;
	await expect.poll(() => testServer.activeStreamCount).toBe(1);
	await expect(undo).toBeEnabled();

	await page
		.getByRole("button", { name: "Выйти из просмотра", exact: true })
		.click();
	await expect(
		page.getByRole("button", { name: "Режим просмотра", exact: true }),
	).toBeFocused();
	const selector = page.getByRole("combobox", {
		name: "Рабочее пространство — выбор склада",
		exact: true,
	});
	await selector.click();
	await page
		.getByRole("option", { name: "Северный склад", exact: true })
		.click();
	await page
		.getByRole("alertdialog", { name: "Покинуть карту?" })
		.getByRole("button", { name: "Покинуть карту", exact: true })
		.click();

	await expect(page).toHaveURL(/\/warehouses\/warehouse-north\/map$/);
	await expect(page.locator("canvas[aria-label]")).toBeVisible();
	await expect(undo).toHaveCount(0);

	await selector.click();
	await page
		.getByRole("option", { name: "Центральный склад", exact: true })
		.click();
	await expect(page).toHaveURL(/\/warehouses\/warehouse-demo\/map$/);
	await page
		.getByRole("button", { name: "Режим просмотра", exact: true })
		.click();
	await page
		.getByRole("button", { name: "Редактирование", exact: true })
		.click();
	await page
		.getByRole("menuitem", { name: "Строительство", exact: true })
		.click();
	await expect(undo).toBeDisabled();

	await page
		.getByRole("button", { name: "Выйти из просмотра", exact: true })
		.click();
	await expect.poll(() => testServer.activeStreamCount).toBe(1);
	await page.route("**/api/v1/auth/logout", (route) =>
		route.fulfill({ status: 204 }),
	);
	await page.getByRole("button", { name: "Меню профиля" }).click();
	await page.getByRole("menuitem", { name: "Выйти", exact: true }).click();
	await expect(page).toHaveURL(/\/auth$/);
	await expect.poll(() => testServer.activeStreamCount).toBe(0);
}
