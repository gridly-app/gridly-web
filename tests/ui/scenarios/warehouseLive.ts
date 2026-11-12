import { expect } from "@playwright/test";
import type { UiScenario } from "../uiBrowserFixture";

export async function warehouseLiveScenario({
	api,
	page,
	ready,
	signIn,
	testServer,
}: UiScenario) {
	if (!testServer.hasLocalStream) {
		console.log("SKIP warehouse-live in external server mode");
		return;
	}
	await signIn();
	await ready("map");
	await expect.poll(() => testServer.activeStreamCount).toBe(1);
	const reads = api.mapStateReads;
	await page.waitForTimeout(5500);
	expect(api.mapStateReads).toBe(reads);
	expect(testServer.streamRequests).toBeGreaterThan(0);
	console.log("PASS healthy SSE disables map-state polling");
	const connectionsBeforeHide = testServer.streamRequests;
	await page.evaluate(() => {
		Object.defineProperty(document, "hidden", {
			configurable: true,
			value: true,
		});
		document.dispatchEvent(new Event("visibilitychange"));
	});
	await expect.poll(() => testServer.activeStreamCount).toBe(0);
	const readsWhileHidden = api.mapStateReads;
	await page.waitForTimeout(1200);
	expect(api.mapStateReads).toBe(readsWhileHidden);
	await page.evaluate(() => {
		Object.defineProperty(document, "hidden", {
			configurable: true,
			value: false,
		});
		document.dispatchEvent(new Event("visibilitychange"));
	});
	await expect
		.poll(() => testServer.streamRequests)
		.toBeGreaterThan(connectionsBeforeHide);
	await expect.poll(() => api.mapStateReads).toBeGreaterThan(readsWhileHidden);
	console.log("PASS visibility closes SSE and resynchronizes on return");
}
