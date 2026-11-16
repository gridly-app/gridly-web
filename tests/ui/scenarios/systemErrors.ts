import { expect } from "@playwright/test";
import type { UiScenario } from "../uiBrowserFixture";

export async function systemErrorsScenario({ page, base, signIn }: UiScenario) {
	await signIn();
	const operationId = "951fe0ae-8284-4a9a-acbb-bf5dcbdfc282";
	const occurredAt = "2026-11-13T12:00:00Z";
	const mapError = {
		occurred_at: occurredAt,
		component: "warehouse",
		message: "Не удалось сохранить карту",
		correlation_id: operationId,
		retry_state: null,
	};
	const unrelatedError = {
		...mapError,
		message: "Поток обновлений недоступен",
		correlation_id: "d31af7a9-922b-4974-b4c5-423460729151",
	};
	const systemRoute = "**/api/v1/admin/shipment-system?*";
	const auditRoute = "**/api/v1/admin/shipment-audit?*";
	await page.route(systemRoute, (route) =>
		route.fulfill({
			json: {
				checked_at: occurredAt,
				components: [],
				error_count: 2,
				recent_errors: [mapError, unrelatedError],
				jobs: [],
			},
		}),
	);
	await page.route(auditRoute, (route) =>
		route.fulfill({
			json: {
				total: 1,
				items: [
					{
						id: "73bc975e-8895-4feb-84a2-568cf7ddecce",
						occurred_at: occurredAt,
						event_type: "warehouse.map.saved",
						result: "failure",
						actor_id: "user-1",
						actor_name: "Анна Смирнова",
						source: "account",
						warehouse_id: "warehouse-demo",
						warehouse_name: "Центральный склад",
						order_id: null,
						changes: [],
						correlation_id: operationId,
					},
				],
			},
		}),
	);
	await page.goto(`${base}/admin/shipments?tab=system`);
	const errorRow = page.getByRole("row").filter({ hasText: mapError.message });
	await expect(errorRow).toContainText(
		"Карта склада · Сохранение карты склада",
	);
	await expect(errorRow).toContainText("Анна Смирнова · Центральный склад");
	await expect(
		page.getByRole("row").filter({ hasText: unrelatedError.message }),
	).toContainText("Контекст операции недоступен");
	await errorRow.getByRole("button", { name: "Связанные события" }).click();
	const errorDialog = page.getByRole("dialog", { name: "Подробности ошибки" });
	await expect(
		errorDialog.getByRole("table", { name: "Связанные события" }),
	).toContainText("Анна Смирнова");
	await expect(
		errorDialog.getByRole("link", { name: "Открыть раздел «Карта склада»" }),
	).toHaveAttribute("href", "/warehouses/warehouse-demo/map");
	await errorDialog.getByText("Технические данные").click();
	await expect(
		errorDialog.getByText(operationId, { exact: true }),
	).toBeVisible();
}
