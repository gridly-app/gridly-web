import { expect } from "@playwright/test";
import type { UiScenario } from "../uiBrowserFixture";

export async function responsiveLayoutScenario({
	api,
	base,
	page,
	ready,
	screenshot,
	signIn,
}: UiScenario) {
	await signIn();
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
			await screenshot(`auth-${dark ? "dark" : "light"}-${width}`);
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
			await screenshot(`landing-${dark ? "dark" : "light"}-${width}`);
			const categories = api.accountStore.get(
				"/api/v1/warehouses/warehouse-demo/categories",
			) as { items: { name: string }[] };
			const firstCategory = categories.items[0];
			if (!firstCategory) throw new Error("Missing category fixture");
			const originalCategoryName = firstCategory.name;
			firstCategory.name = "Очень длинное название категории складских товаров";
			await ready("map");
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
				await screenshot(`editor-${name}-${dark ? "dark" : "light"}-${width}`);
				await page.keyboard.press("Escape");
				await ready("map");
			}
			firstCategory.name = originalCategoryName;
			await ready("catalog");
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
					page.getByRole("heading", {
						name: "Центральный склад",
						exact: true,
					}),
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
				await ready(path);
				expect(
					await page.evaluate(
						() => document.documentElement.scrollWidth > window.innerWidth,
					),
					`${dark ? "dark" : "light"} ${width} ${path}`,
				).toBe(false);
			}
			await ready("information");
			const overflow = await page.evaluate(
				() => document.documentElement.scrollWidth > window.innerWidth,
			);
			expect(overflow).toBe(false);
			await screenshot(`${dark ? "dark" : "light"}-${width}`);
		}
	}
	await page.setViewportSize({ width: 1440, height: 1000 });
	await ready("catalog");
	await page.evaluate(() => {
		document.documentElement.style.zoom = "2";
	});
	await screenshot("zoom-200");
	await page.evaluate(() => {
		document.documentElement.style.zoom = "";
	});
	console.log("PASS responsive themes, mobile sheet and 200% zoom");
}
