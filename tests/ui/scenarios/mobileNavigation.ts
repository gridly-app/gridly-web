import { expect } from "@playwright/test";

import type { UiScenario } from "../uiBrowserFixture";

export async function mobileNavigationScenario({
	page,
	ready,
	signIn,
}: UiScenario) {
	await signIn();
	await page.setViewportSize({ width: 375, height: 900 });
	await ready("catalog");

	const trigger = page.getByRole("button", {
		name: "Открыть меню",
		exact: true,
	});
	const navigation = page.getByRole("dialog", { name: "Навигация" });

	await trigger.click();
	await expect(navigation).toBeVisible();
	await page.keyboard.press("Escape");
	await expect(navigation).toHaveCount(0);
	await expect(trigger).toBeFocused();

	await trigger.click();
	await navigation
		.getByRole("link", { name: "Информация", exact: true })
		.click();
	await expect(navigation).toHaveCount(0);
	await expect(
		page.getByRole("heading", { name: "Центральный склад" }),
	).toBeVisible();
}
