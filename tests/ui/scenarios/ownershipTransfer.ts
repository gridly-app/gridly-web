import { expect } from "@playwright/test";
import type { UiScenario } from "../uiBrowserFixture";

export async function ownershipTransferScenario({
	page,
	base,
	signIn,
}: UiScenario) {
	let deleteAttempts = 0;

	await page.route("**/api/v1/admin/shipment-users/*/warehouses/*", (route) => {
		if (route.request().method() !== "DELETE") return route.fallback();

		deleteAttempts += 1;

		if (deleteAttempts > 1) return route.fallback();

		return route.fulfill({
			status: 409,
			json: {
				code: "WAREHOUSE_OWNER_TRANSFER_REQUIRED",
				message: "Сначала передайте владение складом",
			},
		});
	});

	await signIn();
	await page.goto(`${base}/admin/shipments?tab=users`);

	const revoke = page.getByRole("button", {
		name: "Отозвать доступ к складу «Центральный склад»: Иван Петров",
	});

	await revoke.click();

	const confirmation = page.getByRole("dialog", {
		name: "Отозвать доступ к складу?",
	});
	const confirm = confirmation.getByRole("button", {
		name: "Отозвать доступ к складу",
	});

	await confirm.click();
	await expect(confirmation).toContainText(
		"Сначала передайте владение складом другому пользователю.",
	);
	await confirmation.getByRole("button", { name: "Передать владение" }).click();

	const transfer = page.getByRole("dialog", {
		name: "Передать владение складом",
	});
	const submit = transfer.getByRole("button", { name: "Передать владение" });

	await expect(submit).toBeDisabled();
	await transfer.getByRole("combobox", { name: "Новый владелец" }).click();
	await page
		.getByRole("option", { name: "Анна Смирнова (admin@gridly.local)" })
		.click();

	const [request] = await Promise.all([
		page.waitForRequest(
			(sent) => sent.method() === "POST" && sent.url().endsWith("/owner"),
		),
		submit.click(),
	]);

	expect(new URL(request.url()).pathname).toBe(
		"/api/v1/admin/warehouses/warehouse-demo/owner",
	);
	expect(request.postDataJSON()).toEqual({ user_id: "user-sandbox-admin" });

	await confirm.click();
	await expect(page.getByText("Доступ к складу отозван.")).toBeVisible();
	await expect(revoke).toHaveCount(0);
	expect(deleteAttempts).toBe(2);
}
