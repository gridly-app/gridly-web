import { mkdir } from "node:fs/promises";
import { chromium, expect, type Page } from "@playwright/test";
import { z } from "zod";

const schema = z.object({
	routes: z.array(
		z.object({
			name: z.string(),
			request: z.object({ method: z.string(), url: z.string() }),
			response: z.object({
				status: z.number(),
				body: z.object({ data: z.string() }).optional(),
			}),
			rules: z.unknown().optional(),
		}),
	),
});
const fixture = schema.parse(
	Bun.YAML.parse(
		await Bun.file(
			new URL("../../bruno/mocks/Gridly API.yml", import.meta.url),
		).text(),
	),
);
const base = process.env.GRIDLY_UI_URL || "http://127.0.0.1:4175";
const output = new URL("../../.artifacts/ui/", import.meta.url).pathname;
await mkdir(output, { recursive: true });
const server = process.env.GRIDLY_UI_URL
	? null
	: Bun.spawn(
			[
				"bun",
				"node_modules/vite/bin/vite.js",
				"--host",
				"127.0.0.1",
				"--port",
				"4175",
				"--strictPort",
			],
			{
				cwd: new URL("../../", import.meta.url).pathname,
				stdout: "ignore",
				stderr: "inherit",
			},
		);
const browser = await chromium.launch({
	headless: true,
	...(process.env.GRIDLY_CHROMIUM
		? { executablePath: process.env.GRIDLY_CHROMIUM }
		: {}),
});
let activePage: Page | undefined;
const errors: string[] = [];
let mutations = 0,
	readOnly = false,
	failProduct = false,
	offlineData = false,
	failDemo = false;
const permissions = [
	"create-product",
	"create-category",
	"create-robot",
	"create-inbound-order",
	"create-outbound-order",
	"edit-settings",
	"save-map",
	"optimize-routes",
	"resize-map",
	"delete",
	"edit",
];
const store = new Map(
	fixture.routes
		.filter(
			(item) =>
				item.request.method === "GET" &&
				item.response.status === 200 &&
				!item.rules &&
				item.response.body,
		)
		.map((item) => [
			item.request.url,
			JSON.parse(item.response.body?.data || "null") as Record<string, unknown>,
		]),
);
function prepare(value: unknown): unknown {
	if (Array.isArray(value)) return value.map(prepare);
	if (!value || typeof value !== "object") return value;
	return Object.fromEntries(
		Object.entries(value).map(([key, item]) => [
			key,
			key === "allowed_actions"
				? readOnly
					? []
					: permissions
				: key === "can_write_off"
					? !readOnly
					: prepare(item),
		]),
	);
}
async function ready(page: Page, path: string) {
	await page.goto(`${base}/warehouses/warehouse-demo/${path}`);
	await expect(
		page
			.locator(
				path === "map"
					? "canvas"
					: path === "history"
						? "[data-history-log]"
						: path === "settings"
							? "form"
							: path === "information"
								? "[data-information-dashboard]"
								: "[data-slot=table]",
			)
			.first(),
	).toBeVisible();
}
async function screenshot(page: Page, name: string) {
	await page.screenshot({ path: `${output}/${name}.png`, fullPage: true });
}
try {
	for (let attempt = 0; attempt < 100; attempt++) {
		try {
			if ((await fetch(base)).ok) break;
		} catch (error) {
			if (attempt === 99) throw error;
		}
		await Bun.sleep(100);
	}
	const context = await browser.newContext({
		viewport: { width: 1440, height: 1000 },
		reducedMotion: "reduce",
		locale: "ru-RU",
	});
	const page = await context.newPage();
	activePage = page;
	page.on("pageerror", (error) => {
		errors.push(error.message);
		console.error(error);
	});
	page.on("console", (message) => {
		if (message.type() === "error" && message.text().includes("Error:"))
			errors.push(message.text());
	});
	await page.route("**/api/v1/**", async (route) => {
		const request = route.request(),
			path = new URL(request.url()).pathname,
			method = request.method();
		if (failDemo && method === "POST" && path === "/api/v1/demo/sessions") {
			await route.fulfill({
				status: 503,
				json: { error: { message: "Тестовая ошибка запуска демо" } },
			});
			return;
		}
		if (offlineData && method === "GET" && path.includes("/warehouses")) {
			await route.fulfill({
				status: 503,
				json: { error: { message: "Тестовая недоступность API" } },
			});
			return;
		}
		if (method === "GET" && store.has(path)) {
			await route.fulfill({ status: 200, json: prepare(store.get(path)) });
			return;
		}
		const found = fixture.routes.find(
			(item) =>
				item.request.method === method &&
				new RegExp(`^${item.request.url.replace(/:[^/]+/g, "[^/]+")}$`).test(
					path,
				) &&
				(path.endsWith("/auth/login")
					? item.name === "Login — admin"
					: !item.rules),
		);
		if (
			method !== "GET" &&
			!path.includes("/auth/") &&
			!path.includes("/demo/")
		) {
			mutations++;
			await Bun.sleep(150);
			if (failProduct && path.endsWith("/products")) {
				await route.fulfill({
					status: 422,
					json: { error: { message: "Тестовая ошибка сохранения товара" } },
				});
				return;
			}
			if (path.endsWith("/products") && method === "POST") {
				const product = {
					...request.postDataJSON(),
					id: "product-ui",
					revision: 1,
					allowed_actions: permissions,
				};
				const data = store.get(path) as { items: unknown[]; total: number };
				data.items.push(product);
				data.total++;
			}
			if (path.endsWith("/inventory/write-offs")) {
				const data = request.postDataJSON() as {
					stock_id: string;
					quantity: number;
				};
				const collection = store.get(path.replace("/write-offs", "")) as {
					items: { id: string; quantity: number; available_quantity: number }[];
				};
				const stock = collection.items.find(
					(item) => item.id === data.stock_id,
				);
				if (!stock) throw new Error("Missing write-off stock fixture");
				stock.quantity -= data.quantity;
				stock.available_quantity -= data.quantity;
			}
			if (path.endsWith("/layout/commit")) {
				await route.fulfill({ status: 204 });
				return;
			}
			if (path.endsWith("/orders") && method === "POST") {
				await route.fulfill({
					status: 422,
					json: { error: { message: "Тестовая ошибка создания заказа" } },
				});
				return;
			}
			if (path === "/api/v1/warehouses" && method === "POST") {
				await route.fulfill({
					status: 422,
					json: { error: { message: "Тестовая ошибка создания склада" } },
				});
				return;
			}
			await route.fulfill({ status: 204 });
			return;
		}
		if (!found) throw new Error(`Missing UI fixture: ${method} ${path}`);
		await route.fulfill({
			status: found.response.status,
			contentType: "application/json",
			body: found.response.body?.data || "",
		});
	});
	await page.goto(`${base}/auth`);
	await expect(
		page.getByRole("textbox", { name: "Логин", exact: true }),
	).toBeVisible();
	await screenshot(page, "auth");
	await page.getByRole("button", { name: "Войти", exact: true }).click();
	expect(
		await page
			.getByLabel("Логин", { exact: true })
			.evaluate((element: HTMLInputElement) => element.validity.valueMissing),
	).toBe(true);
	await page.getByLabel("Логин", { exact: true }).fill("admin@gridly.local");
	await page.getByLabel("Пароль", { exact: true }).fill("gridly-demo");
	await page.getByRole("checkbox", { name: "Показать пароль" }).check();
	await expect(page.getByLabel("Пароль", { exact: true })).toHaveAttribute(
		"type",
		"text",
	);
	await page.getByRole("button", { name: "Войти", exact: true }).click();
	await page.waitForURL("**/warehouses/warehouse-demo/**");
	await expect(page.locator("canvas").first()).toBeVisible();
	for (const path of [
		"map",
		"catalog",
		"robots",
		"inbound",
		"outbound",
		"inventory",
		"history",
		"information",
		"settings",
	]) {
		await ready(page, path);
		await expect(page.locator("input[role=combobox]")).toHaveCount(0);
		await expect(page.locator("[title]")).toHaveCount(0);
		if (path === "information") {
			const metrics = page.getByRole("region", {
				name: "Основные показатели склада",
				exact: true,
			});
			await expect(metrics.locator("[data-metric]")).toHaveCount(4);
			await expect(metrics.locator('[data-tone="active"]')).toContainText(
				"В работе",
			);
			await expect(metrics.locator('[data-tone="reserved"]')).toContainText(
				"В резерве",
			);
		}
		if (path === "inventory") {
			await expect(
				page.getByRole("radio", { name: "На складе", exact: true }),
			).toBeChecked();
			await expect(
				page.getByRole("radio", { name: "Ожидается", exact: true }),
			).toBeVisible();
			await expect(
				page.getByRole("radio", { name: "Списания", exact: true }),
			).toBeVisible();
			await page.getByRole("radio", { name: "Ожидается", exact: true }).click();
			await expect(
				page.getByRole("combobox", { name: "Категория остатков", exact: true }),
			).toBeVisible();
			await page.getByRole("radio", { name: "На складе", exact: true }).click();
		}
		await screenshot(page, path);
	}
	console.log("PASS all warehouse screens");
	// Search and segmented keyboard selection.
	await ready(page, "catalog");
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
	await page.getByRole("radio", { name: "Товары", exact: true }).click();
	await page.getByRole("button", { name: "Фильтры", exact: true }).click();
	await page
		.getByRole("combobox", { name: "Статус каталога", exact: true })
		.click();
	await page.getByRole("option", { name: "Активные", exact: true }).hover();
	await expect(page.locator(".glide-select-highlight")).toBeVisible();
	await expect
		.poll(() =>
			page.locator('[data-slot="select-list"]').evaluate((root) => {
				const pill = root
					.querySelector(".glide-select-highlight")
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
	// Controlled Select and Combobox, focus trap/return, validation, pending and retry.
	const create = page.getByRole("button", { name: "Новый товар", exact: true });
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
	failProduct = true;
	const save = dialog.getByRole("button", { name: "Сохранить", exact: true });
	await save.click();
	await expect(dialog.getByRole("alert")).toContainText(
		"Тестовая ошибка сохранения товара",
	);
	const before = mutations;
	failProduct = false;
	await save.evaluate((element: HTMLButtonElement) => {
		element.click();
		element.click();
	});
	await expect(dialog).toHaveCount(0);
	expect(mutations - before).toBe(1);
	await expect(page.getByText("UI тест товара", { exact: true })).toBeVisible();
	await expect(create).toBeFocused();
	await create.click();
	await page.keyboard.press("Escape");
	await expect(dialog).toHaveCount(0);
	await expect(create).toBeFocused();
	console.log("PASS forms, combobox, keyboard, failed save and retry");
	await ready(page, "inventory");
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
	await ready(page, "robots");
	const beforeDelete = mutations;
	await page
		.getByRole("button", { name: "Удалить", exact: true })
		.first()
		.click();
	await expect(page.getByRole("alertdialog")).toBeVisible();
	expect(mutations).toBe(beforeDelete);
	await page.getByRole("button", { name: "Отмена", exact: true }).click();
	expect(mutations).toBe(beforeDelete);
	console.log("PASS destructive confirmation");
	await ready(page, "settings");
	const setting = page.getByRole("switch").first();
	const previousChecked = await setting.isChecked();
	await setting.click();
	expect(await setting.isChecked()).toBe(!previousChecked);
	await expect(
		page.getByRole("button", { name: "Сохранить подтверждения", exact: true }),
	).toBeEnabled();
	// Warehouse creation error retains its form.
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
		"Тестовая ошибка создания склада",
	);
	await page.keyboard.press("Escape");
	console.log("PASS switch and warehouse creation error");

	await ready(page, "inbound");
	await page
		.getByRole("button", { name: "Новая поставка", exact: true })
		.click();
	await expect(dialog).toBeVisible();
	await dialog.getByLabel("Поставщик *", { exact: true }).fill("UI поставщик");
	await dialog.getByRole("combobox").first().click();
	await page.getByRole("option", { name: /Кофе/ }).click();
	await dialog.getByRole("button", { name: "Создать черновик" }).click();
	await expect(dialog.getByRole("alert")).toContainText(
		"Тестовая ошибка создания заказа",
	);
	await dialog.getByRole("button", { name: "Закрыть", exact: true }).click();
	await expect(
		page.getByRole("heading", { name: "Сохранить незавершённую форму?" }),
	).toBeVisible();
	await page
		.getByRole("button", { name: "Сохранить форму", exact: true })
		.click();
	console.log("PASS order draft and API error");
	await ready(page, "map");
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
	await screenshot(page, "editor-construction");
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
	await screenshot(page, "editor-routes");
	await page.keyboard.press("Escape");
	console.log("PASS map save and editor exceptions");
	await ready(page, "information");
	await expect(
		page.getByRole("region", { name: "Динамика поставок и отгрузок" }),
	).toBeVisible();
	await expect(
		page.getByRole("region", { name: "Распределение статусов заказов" }),
	).toBeVisible();
	await expect(
		page.getByRole("region", { name: "Доступные и зарезервированные остатки" }),
	).toBeVisible();
	await expect(
		page.getByRole("region", { name: "Остатки по категориям" }),
	).toBeVisible();
	const download = page.waitForEvent("download");
	await page.getByRole("button", { name: "Выгрузить CSV" }).click();
	expect((await download).suggestedFilename()).toContain(
		"gridly-warehouse-demo-",
	);
	await page
		.locator("summary")
		.filter({ hasText: "Период и дополнительные фильтры" })
		.click();
	await page.getByLabel("С", { exact: true }).fill("2025-01-01");
	await page.getByLabel("По", { exact: true }).fill("2025-01-02");

	await expect(
		page.getByText("Нет операций за выбранный период.", { exact: true }),
	).toBeVisible();
	console.log("PASS analytics charts, empty periods and CSV");
	// Both themes and responsive navigation; check root layout and keyboard reachability.
	for (const dark of [false, true]) {
		await page.evaluate((value) => {
			localStorage.setItem("gridly.theme", value ? "dark" : "light");
		}, dark);
		for (const width of [375, 768, 1440]) {
			await page.setViewportSize({ width, height: 1000 });
			await page.goto(`${base}/auth`);
			await expect(page.getByLabel("Логин", { exact: true })).toBeVisible();
			expect(
				await page.evaluate(
					() => document.documentElement.scrollWidth > innerWidth,
				),
			).toBe(false);
			await screenshot(page, `auth-${dark ? "dark" : "light"}-${width}`);
			await page.goto(`${base}/`);
			const scenarioPanel = page.getByRole("region", {
				name: "Иллюстрация складского сценария",
			});
			await expect(scenarioPanel).toBeVisible();
			const panelHeight = await scenarioPanel.evaluate(
				(el) => el.getBoundingClientRect().height,
			);
			for (const [label, id] of [
				["Приёмка", "inbound"],
				["Хранение", "storage"],
				["Отгрузка", "outbound"],
			] as const) {
				await page.getByRole("radio", { name: label, exact: true }).click();
				await expect(
					scenarioPanel.locator(`[data-scenario-map=${id}]`),
				).toBeVisible();
				await expect(
					page.getByRole("radio", { name: label, exact: true }),
				).toHaveAttribute("aria-checked", "true");
				await expect(scenarioPanel.locator('[data-active="true"]')).toHaveCount(
					8,
				);
				expect(
					Math.abs(
						(await scenarioPanel.evaluate(
							(el) => el.getBoundingClientRect().height,
						)) - panelHeight,
					),
				).toBeLessThan(2);
			}
			expect(
				await page.evaluate(
					() => document.documentElement.scrollWidth > innerWidth,
				),
			).toBe(false);
			await screenshot(page, `landing-${dark ? "dark" : "light"}-${width}`);
			const categories = store.get(
				"/api/v1/warehouses/warehouse-demo/categories",
			) as { items: { name: string }[] };
			const firstCategory = categories.items[0];
			if (!firstCategory) throw new Error("Missing category fixture");
			const originalCategoryName = firstCategory.name;
			firstCategory.name = "Очень длинное название категории складских товаров";
			await ready(page, "map");
			for (const [label, name] of [
				["Строительство", "construction"],
				["Настройка путей", "routes"],
			] as const) {
				await page
					.getByRole("button", { name: "Режим просмотра", exact: true })
					.click();
				await page
					.getByRole("button", { name: "Редактирование", exact: true })
					.click();
				await page.getByRole("menuitem", { name: label, exact: true }).click();
				const saveAction = page.getByRole("button", {
					name: "Сохранить изменения",
					exact: true,
				});
				await saveAction.scrollIntoViewIfNeeded();
				await expect(saveAction).toBeInViewport();
				const bounds = await saveAction.boundingBox();
				expect(
					bounds && bounds.x >= 0 && bounds.x + bounds.width <= width,
				).toBe(true);
				await screenshot(
					page,
					`editor-${name}-${dark ? "dark" : "light"}-${width}`,
				);
				await page.keyboard.press("Escape");
				await ready(page, "map");
			}
			firstCategory.name = originalCategoryName;
			await ready(page, "catalog");
			await expect(page.locator("html")).toHaveAttribute(
				"data-theme",
				dark ? "dark" : "light",
			);
			if (width < 851) {
				await page
					.getByRole("button", { name: "Открыть меню", exact: true })
					.click();
				await expect(
					page.getByRole("dialog", { name: "Навигация", exact: true }),
				).toBeVisible();
				await page
					.getByRole("link", { name: "Информация", exact: true })
					.click();
				await expect(
					page.getByRole("dialog", { name: "Навигация", exact: true }),
				).toHaveCount(0);
				await expect(
					page.getByRole("heading", { name: "Центральный склад", exact: true }),
				).toBeVisible();
			}
			for (const path of [
				"map",
				"catalog",
				"robots",
				"inbound",
				"outbound",
				"inventory",
				"history",
				"settings",
			]) {
				await ready(page, path);
				expect(
					await page.evaluate(
						() => document.documentElement.scrollWidth > window.innerWidth,
					),
					`${dark ? "dark" : "light"} ${width} ${path}`,
				).toBe(false);
			}
			await ready(page, "information");
			const overflow = await page.evaluate(
				() => document.documentElement.scrollWidth > window.innerWidth,
			);
			expect(overflow).toBe(false);
			await screenshot(page, `${dark ? "dark" : "light"}-${width}`);
		}
	}
	await page.setViewportSize({ width: 1440, height: 1000 });
	await ready(page, "catalog");
	await page.evaluate(() => {
		document.documentElement.style.zoom = "2";
	});
	await screenshot(page, "zoom-200");
	await page.evaluate(() => {
		document.documentElement.style.zoom = "";
	});
	console.log("PASS responsive themes, mobile sheet and 200% zoom");
	readOnly = true;
	await ready(page, "catalog");
	await expect(
		page.getByRole("button", { name: "Новый товар", exact: true }),
	).toBeDisabled();
	await page.getByRole("button", { name: "Новый товар", exact: true }).hover();
	await expect(page.getByRole("tooltip")).toContainText("Создание недоступно");
	const tooltip = page.getByRole("tooltip");
	await tooltip.hover();
	await expect(tooltip).toBeVisible();
	await page.keyboard.press("Escape");
	await expect(tooltip).toHaveCount(0);
	await ready(page, "catalog");
	await page.keyboard.press("Tab");
	await page.getByRole("button", { name: "Новый товар", exact: true }).focus();
	await expect(tooltip).toBeVisible();
	await page.keyboard.press("Escape");
	await expect(tooltip).toHaveCount(0);
	readOnly = false;
	offlineData = true;
	await page.reload();
	await expect(page.getByRole("alert")).toContainText(
		/Тестовая недоступность|синхронизировать/,
	);
	offlineData = false;
	await page.getByRole("button", { name: "Повторить", exact: true }).click();
	await expect(
		page.getByRole("button", { name: "Новый товар", exact: true }),
	).toBeEnabled();
	await page.goto(`${base}/`);
	await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
	await screenshot(page, "landing");
	await page.setViewportSize({ width: 1440, height: 1000 });
	await page.emulateMedia({ reducedMotion: "no-preference" });
	await page.reload();
	const scenarios = page.getByRole("radiogroup", {
		name: "Складские сценарии",
	});
	await expect(scenarios).toBeVisible();
	await scenarios.getByRole("radio", { name: "Отгрузка", exact: true }).click();
	await expect(
		scenarios.getByRole("radio", { name: "Отгрузка", exact: true }),
	).toBeChecked();
	await expect
		.poll(() =>
			scenarios.evaluate((root) => {
				const thumb = root
					.querySelector(".rubber-segment-thumb")
					?.getBoundingClientRect();
				const selected = root
					.querySelector('[role="radio"][data-checked]')
					?.getBoundingClientRect();
				return thumb && selected
					? Math.abs(thumb.x - selected.x) +
							Math.abs(thumb.width - selected.width)
					: Infinity;
			}),
		)
		.toBeLessThan(2);
	const shapeCanvas = page.locator(".shape-grid-canvas");
	await expect(shapeCanvas).toBeVisible();
	expect(
		await shapeCanvas.evaluate(
			(el: HTMLCanvasElement) => el.width > 1 && el.height > 1,
		),
	).toBe(true);
	await page.mouse.move(200, 200);
	await screenshot(page, "landing-pointer");
	await page.emulateMedia({ reducedMotion: "reduce" });
	await page.reload();
	await expect(page.locator(".shape-grid-canvas")).toBeVisible();
	await page.setViewportSize({ width: 375, height: 1000 });
	expect(
		await page.evaluate(
			() => document.documentElement.scrollWidth > innerWidth,
		),
	).toBe(false);
	await page.evaluate(() => {
		document.documentElement.style.zoom = "2";
	});
	expect(
		await page.evaluate(
			() => document.documentElement.scrollWidth > innerWidth,
		),
	).toBe(false);
	const heroTitle = await page.locator("h1 > span").boundingBox();
	expect(
		heroTitle && heroTitle.x >= 0 && heroTitle.x + heroTitle.width <= 376,
	).toBe(true);
	await screenshot(page, "landing-zoom-200");
	await page.evaluate(() => {
		document.documentElement.style.zoom = "";
	});
	failDemo = true;
	await page.getByRole("button", { name: "Открыть демо", exact: true }).click();
	await expect(page.getByRole("alert")).toContainText(
		"Тестовая ошибка запуска демо",
	);
	await expect(
		page.getByRole("button", { name: "Открыть демо", exact: true }),
	).toBeEnabled();
	failDemo = false;
	await page.getByRole("button", { name: "Открыть демо", exact: true }).click();
	await page.waitForURL("**/demo/warehouses/warehouse-demo/**");
	await expect(page.locator("canvas").first()).toBeVisible();
	console.log("PASS permissions, API retry, landing and demo");
	expect(errors).toEqual([]);
	console.log(`UI checks passed. Screenshots: ${output}`);
} catch (error) {
	if (activePage) {
		console.error(await activePage.locator("body").innerText());
		await screenshot(activePage, "failure");
	}
	throw error;
} finally {
	await browser.close();
	server?.kill();
}
