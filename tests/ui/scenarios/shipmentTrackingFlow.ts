import { expect } from "@playwright/test";

import type { UiScenario } from "../uiBrowserFixture";
import { loadWorkspaceSamples } from "../../../bruno/mock-fixture";
import type { WorkingShipment } from "../../../src/app/modules/warehouse/shipment-management/model/shipment.dto";

export async function checkShipmentTracking(
	{ page, base }: Pick<UiScenario, "page" | "base">,
	working: WorkingShipment,
	orderPath: string,
) {
	const trackingUrl = `${base}/warehouses/warehouse-demo/deliveries?order=order-out-2087`;
	await page.getByRole("link", { name: "Доставки", exact: true }).click();
	await expect(
		page.getByRole("heading", { name: "Доставки", exact: true }),
	).toBeVisible();
	const delivery = page.getByRole("region", { name: "Этапы доставки" });
	await page.goto(trackingUrl);
	await expect(delivery.locator('[aria-current="step"]')).toContainText(
		"Передан перевозчику",
	);
	await expect(delivery.locator('[data-state="pending"]').last()).toContainText(
		"Доставлен или получен",
	);
	const routeDetails = page.getByRole("region", { name: "Маршрут" });
	await expect(routeDetails.getByText("Адрес погрузки")).toBeVisible();
	await expect(routeDetails.getByText("Адрес выгрузки")).toBeVisible();
	await expect(routeDetails.locator("dd").nth(0)).toHaveText(
		"Центральный склад, Москва, ул. Складочная, 1",
	);
	await expect(routeDetails.locator("dd").nth(1)).toHaveText(
		"Казань, ул. Техническая, 17",
	);
	const orderSelect = page.getByRole("combobox", { name: "Заказ на доставку" });
	await expect(orderSelect).toHaveText("ЗК-2087 · Интернет-заказ #2087");
	await page.route(
		"**/api/v1/warehouses/warehouse-demo/orders/*/shipment",
		(route) =>
			route.request().url().endsWith(orderPath)
				? route.fallback()
				: route.fulfill({ status: 404 }),
	);
	await orderSelect.click();
	await page.getByRole("option", { name: "ЗК-2079 · ИП Волкова" }).click();
	await expect(orderSelect).toHaveText("ЗК-2079 · ИП Волкова");
	await orderSelect.click();
	await page
		.getByRole("option", { name: "ЗК-2087 · Интернет-заказ #2087" })
		.click();
	const inboundPath =
		"/warehouses/warehouse-demo/orders/order-in-1042/shipment";
	const { store } = await loadWorkspaceSamples();
	await page.route(`**/api/v1${inboundPath}`, (route) =>
		route.fulfill({ json: store.get(`/api/v1${inboundPath}`) }),
	);
	await orderSelect.click();
	await page.getByRole("option", { name: /ПР-1042/ }).click();
	await expect(routeDetails.locator("dd").nth(0)).toHaveText(
		"Тверь, Промышленный проезд, 8",
	);
	await expect(routeDetails.locator("dd").nth(1)).toHaveText(
		"Центральный склад, Москва, ул. Складочная, 1",
	);
	await expect(delivery.getByText("Подготовка у поставщика")).toBeVisible();
	await page.goto(
		`${base}/warehouses/warehouse-demo/outbound/order-in-1042/shipment`,
	);
	await expect(
		page.getByText("Редактор отгрузки доступен только для исходящих заказов."),
	).toBeVisible();
	await expect(
		page.getByRole("button", { name: "Сохранить отгрузку" }),
	).toHaveCount(0);
	await page.goto(trackingUrl);
	await orderSelect.click();
	await page.getByRole("option", { name: /ЗК-2087/ }).click();
	const orderDetails = page.getByRole("region", { name: /^Стоимость:/ });
	await expect(orderDetails.getByRole("heading")).toHaveText(
		/^Стоимость: 4\s270,00\s₽$/,
	);
	await expect(orderDetails).not.toContainText("Интернет-заказ #2087");
	const items = orderDetails.getByRole("table", { name: "Состав заказа" });
	await expect(items.getByRole("row", { name: /Кофе в зёрнах/ })).toContainText(
		"2 шт.",
	);
	await expect(
		items.getByRole("row", { name: /Лампа настольная/ }),
	).toContainText("1 шт.");
	await page.setViewportSize({ width: 390, height: 820 });
	await expect(orderSelect).toBeVisible();
	expect(
		await orderSelect
			.locator('[data-slot="select-value"]')
			.evaluate((value) => value.scrollWidth <= value.clientWidth),
	).toBe(true);
	await page.setViewportSize({ width: 1440, height: 1000 });

	const previousState = working.order.state;
	const previousRoute = working.route;
	working.route = null;
	working.order.state = "delivered";
	await page.reload();
	await expect(delivery.locator('[data-state="completed"]')).toHaveCount(4);
	await expect(delivery.locator('[aria-current="step"]')).toHaveCount(1);
	await expect(
		routeDetails.getByText("Адрес не указан", { exact: true }).first(),
	).toBeVisible();
	working.order.state = previousState;
	working.route = previousRoute;
}
