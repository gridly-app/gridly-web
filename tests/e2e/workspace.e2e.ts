import { randomUUID } from "node:crypto";
import { expect, type Page, test } from "@playwright/test";

function setting(name: string) {
	const value = process.env[name];

	if (!value)
		throw new Error(`Set ${name} for the disposable Gridly test environment.`);

	return value;
}

function warehousePath(path: string) {
	return `/warehouses/${encodeURIComponent(setting("GRIDLY_E2E_WAREHOUSE_ID"))}/${path}`;
}

async function logIn(page: Page) {
	await page
		.getByLabel("Логин", { exact: true })
		.fill(setting("GRIDLY_E2E_LOGIN"));
	await page
		.getByLabel("Пароль", { exact: true })
		.fill(setting("GRIDLY_E2E_PASSWORD"));

	const [login] = await Promise.all([
		page.waitForResponse(
			(response) =>
				new URL(response.url()).pathname.endsWith("/auth/login") &&
				response.request().method() === "POST",
		),
		page.getByRole("button", { name: "Войти", exact: true }).click(),
	]);

	expect(login.ok()).toBe(true);
}

test.beforeEach(() => {
	setting("GRIDLY_E2E_URL");
});

test("anonymous deep link opens sign-in without exposing stock", async ({
	page,
}) => {
	await page.goto(warehousePath("inventory"));

	await expect(page).toHaveURL(/\/auth$/);
	await expect(page.getByLabel("Логин", { exact: true })).toBeVisible();
	await expect(page.getByRole("table")).toHaveCount(0);
});

test("sign-in returns to the filtered warehouse and reload restores the account", async ({
	page,
}) => {
	const path = `${warehousePath("inventory")}?view=writeoffs`;

	await page.goto(path);
	await logIn(page);

	await expect(page).toHaveURL(new URL(path, setting("GRIDLY_E2E_URL")).href);
	await expect(
		page.getByRole("radio", { name: "Списания", exact: true }),
	).toBeChecked();

	const [refresh] = await Promise.all([
		page.waitForResponse((response) =>
			new URL(response.url()).pathname.endsWith("/auth/refresh"),
		),
		page.reload(),
	]);

	expect(refresh.ok()).toBe(true);
	await expect(
		page.getByRole("radio", { name: "Списания", exact: true }),
	).toBeChecked();
});

test("warehouse inventory loads seeded stock from the backend", async ({
	page,
}) => {
	await page.goto(warehousePath("inventory"));
	await logIn(page);

	await expect(
		page
			.getByRole("button", {
				name: `Партии: ${setting("GRIDLY_E2E_PRODUCT")}`,
				exact: false,
			})
			.first(),
	).toBeVisible();
});

test("a new inbound draft stays in the order list after reload", async ({
	page,
}) => {
	await page.goto(warehousePath("inbound"));
	await logIn(page);

	const supplier = `E2E ${randomUUID()}`;

	await page.getByRole("button", { name: "Поставка", exact: true }).click();

	const dialog = page.getByRole("dialog");
	await dialog.getByLabel("Поставщик *", { exact: true }).fill(supplier);
	await dialog.getByRole("combobox").first().click();
	await page
		.getByRole("option", { name: setting("GRIDLY_E2E_PRODUCT"), exact: false })
		.click();

	const [created] = await Promise.all([
		page.waitForResponse(
			(response) =>
				new URL(response.url()).pathname.endsWith("/orders") &&
				response.request().method() === "POST",
		),
		dialog.getByRole("button", { name: "Создать черновик" }).click(),
	]);

	expect(created.ok()).toBe(true);
	const order = page.getByRole("row").filter({ hasText: supplier });
	await expect(order).toHaveCount(1);
	await page.reload();
	await expect(order).toHaveCount(1);
});

test("unknown navigation displays a recoverable 404 page", async ({ page }) => {
	await page.goto("/__gridly-e2e-missing");

	await expect(
		page.getByRole("heading", { name: "Страница не найдена" }),
	).toBeVisible();
	await page.getByRole("link", { name: "На главную", exact: true }).click();
	await expect(page.getByRole("heading", { name: "Gridly" })).toBeVisible();
});

test("logging out revokes the browser session before returning to a protected URL", async ({
	page,
}) => {
	const path = warehousePath("inventory");

	await page.goto(path);
	await logIn(page);
	await page.getByRole("button", { name: "Меню профиля" }).click();
	const [logout] = await Promise.all([
		page.waitForResponse((response) =>
			new URL(response.url()).pathname.endsWith("/auth/logout"),
		),
		page.getByRole("menuitem", { name: "Выйти", exact: true }).click(),
	]);

	expect(logout.ok()).toBe(true);
	await page.goto(path);
	await expect(page).toHaveURL(/\/auth$/);
	await expect(page.getByLabel("Логин", { exact: true })).toBeVisible();
});
