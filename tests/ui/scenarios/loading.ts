import { expect } from "@playwright/test";
import type { UiScenario } from "../uiBrowserFixture";

export async function loadingScenario({ base, page, signIn }: UiScenario) {
	const landingChunk = "**/src/app/landing/Landing.tsx";
	const landing = Promise.withResolvers<void>();
	await page.route(landingChunk, async (route) => {
		await landing.promise;
		await route.continue();
	});
	const landingRequested = page.waitForRequest(landingChunk);
	await page.goto(`${base}/`, { waitUntil: "commit" });
	await landingRequested;
	try {
		await expect(page.locator("#root")).toBeEmpty();
		await expect(page.locator("body")).toHaveCSS(
			"background-color",
			"rgb(255, 255, 255)",
		);
	} finally {
		landing.resolve();
	}
	await expect(page.getByRole("heading", { name: "Gridly" })).toBeVisible();
	await expect(page.locator('[data-slot="skeleton"]')).toHaveCount(0);

	await signIn();
	const events = Promise.withResolvers<void>();
	await page.route("**/warehouses/warehouse-demo/events*", async (route) => {
		await events.promise;
		await route.fallback();
	});
	await page.getByRole("link", { name: "История", exact: true }).click();
	const view = page.locator('[data-page="history"]');
	const skeleton = view.locator('[data-slot="skeleton"]');
	try {
		await expect(skeleton).toBeVisible();
		await expect(view.locator("[data-history-log]")).toHaveCount(0);
	} finally {
		events.resolve();
	}
	await expect(view.locator("[data-history-log]")).toBeVisible();
	await expect(skeleton).toHaveCount(0);
}
