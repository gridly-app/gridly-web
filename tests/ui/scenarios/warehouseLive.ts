import { expect } from "@playwright/test";
import { setPageHidden, type UiScenario } from "../uiBrowserFixture";

export async function warehouseLiveScenario({
	api,
	page,
	ready,
	signIn,
	testServer,
}: UiScenario) {
	await signIn();
	await ready("map");
	await expect.poll(() => testServer.activeStreamCount).toBe(1);
	const reads = api.mapStateReads;
	await page.waitForTimeout(5500);
	expect(api.mapStateReads).toBe(reads);
	expect(testServer.streamRequests).toBeGreaterThan(0);
	const connectionsBeforeHide = testServer.streamRequests;
	await setPageHidden(page, true);
	await expect.poll(() => testServer.activeStreamCount).toBe(0);
	const readsWhileHidden = api.mapStateReads;
	await page.waitForTimeout(1200);
	expect(api.mapStateReads).toBe(readsWhileHidden);
	await setPageHidden(page, false);
	await expect
		.poll(() => testServer.streamRequests)
		.toBeGreaterThan(connectionsBeforeHide);
	await expect.poll(() => api.mapStateReads).toBeGreaterThan(readsWhileHidden);
	const stream = "**/api/v1/warehouses/*/stream?*";
	await page.route(stream, (route) =>
		route.fulfill({
			status: 503,
			json: { error: { message: "Поток недоступен" } },
		}),
	);
	await page.reload();
	const alert = page
		.getByRole("alert")
		.filter({ hasText: "Нет связи с потоком состояния склада" });
	await expect(alert).toBeVisible();
	const fallbackReads = api.mapStateReads;
	await expect.poll(() => api.mapStateReads).toBeGreaterThan(fallbackReads);
	await expect(alert).toBeVisible();
	await expect(alert.locator('[data-slot="alert-icon"]')).toBeVisible();
	const position = await alert.boundingBox();
	expect(position?.x).toBeGreaterThan(900);
	expect((position?.y ?? 0) + (position?.height ?? 0)).toBeGreaterThan(970);
	await page.getByRole("link", { name: "Остатки", exact: true }).click();
	await expect(alert).toBeVisible();
	await alert.getByRole("button", { name: "Закрыть уведомление" }).click();
	await expect(alert).toHaveCount(0);
	await page.unroute(stream);
	await expect.poll(() => testServer.activeStreamCount).toBe(1);

	await page.route(stream, (route) =>
		route.fulfill({
			status: 503,
			json: { error: { message: "Поток недоступен" } },
		}),
	);
	await page.reload();
	await expect(alert).toBeVisible();
	await page.unroute(stream);
	await expect(alert).toHaveCount(0, { timeout: 15000 });
}
