import { expect } from "@playwright/test";
import type { UiScenario } from "../uiBrowserFixture";

export async function destructiveConfirmationScenario({
	api,
	page,
	ready,
	signIn,
}: UiScenario) {
	await signIn();
	await ready("robots");
	const beforeDelete = api.mutations;
	await page
		.getByRole("button", { name: "Удалить", exact: true })
		.first()
		.click();
	await expect(page.getByRole("alertdialog")).toBeVisible();
	expect(api.mutations).toBe(beforeDelete);
	await page.getByRole("button", { name: "Отмена", exact: true }).click();
	expect(api.mutations).toBe(beforeDelete);
	console.log("PASS destructive confirmation");
}
