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
		occurred_at: "2026-11-13T13:30:00+03:00",
		component: "constructor",
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
	const mapEvent = {
		id: "73bc975e-8895-4feb-84a2-568cf7ddecce",
		occurred_at: "2026-11-13T15:00:00+03:00",
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
	};
	const older = {
		...mapEvent,
		id: "older-event",
		event_label: "Предыдущая ошибка",
		occurred_at: "2026-11-12T12:00:00Z",
	};
	await page.route(auditRoute, async (route) => {
		const params = new URL(route.request().url()).searchParams;
		expect(params.has("offset")).toBe(false);
		const cursor = params.get("cursor");

		if (params.has("q")) {
			expect(params.get("q")).toBe("Предыдущая");
			return route.fulfill({
				json: { total: 1, items: [older], next_cursor: null },
			});
		}

		return route.fulfill({
			json: {
				total: 2,
				items: [cursor ? older : mapEvent],
				next_cursor: cursor ? null : "opaque-cursor",
			},
		});
	});
	await page.route("**/api/v1/admin/shipment-audit/export?*", async (route) => {
		expect(new URL(route.request().url()).searchParams.get("q")).toBe(
			"Предыдущая",
		);
		await route.fulfill({
			contentType: "text/csv",
			headers: { "Content-Disposition": "attachment; filename=audit.csv" },
			body: "event\nПредыдущая ошибка",
		});
	});
	await page.goto(`${base}/admin/shipments?tab=system`);
	const errors = page.getByRole("table", { name: "Последние ошибки" });
	const errorRow = errors.getByRole("row").nth(1);
	await expect(errorRow).toContainText(mapError.message);
	await expect(errorRow).toContainText(
		"Карта склада · Сохранение карты склада",
	);
	await expect(errorRow).toContainText("Анна Смирнова · Центральный склад");
	await expect(
		page.getByRole("row").filter({ hasText: unrelatedError.message }),
	).toContainText("Контекст операции недоступен");
	await expect(errors).toContainText("constructor");
	await errorRow.getByRole("button", { name: "Связанные события" }).click();
	const errorDialog = page.getByRole("dialog", { name: "Подробности ошибки" });
	await expect(
		errorDialog.getByRole("table", { name: "Связанные события" }),
	).toContainText("Анна Смирнова");
	await expect(
		errorDialog.getByRole("link", { name: "Открыть раздел «Карта склада»" }),
	).toHaveCount(0);
	await expect(errorDialog).toContainText(
		"Показаны события из загруженной части журнала.",
	);
	await errorDialog.getByText("Технические данные").click();
	await expect(
		errorDialog.getByText(operationId, { exact: true }),
	).toBeVisible();

	await page.keyboard.press("Escape");
	await page.getByRole("link", { name: "Журнал аудита", exact: true }).click();
	const auditTable = page.getByRole("table", { name: "События аудита" });
	const exportButton = page.getByRole("button", {
		name: "Скачать аудит в CSV",
	});

	await expect(auditTable).toContainText("Сохранение карты склада");
	await expect(exportButton).toBeEnabled();
	await expect(auditTable).not.toContainText("Предыдущая ошибка");
	await page.getByRole("button", { name: "Загрузить ещё" }).click();
	await expect(auditTable).toContainText("Предыдущая ошибка");
	await page
		.getByRole("textbox", { name: "Поиск по аудиту" })
		.fill("Предыдущая");
	await expect(auditTable).not.toContainText("Сохранение карты склада");
	const downloadEvent = page.waitForEvent("download");
	await exportButton.click();
	expect((await downloadEvent).suggestedFilename()).toBe("audit.csv");

	const missingOrder = "warehouse_id=warehouse-demo&order_id=missing-order";
	await page.goto(`${base}/admin/shipments?tab=system&${missingOrder}`);

	await expect(
		page.getByText("Диагностика этого заказа недоступна."),
	).toBeVisible();
}
