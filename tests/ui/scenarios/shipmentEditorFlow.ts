import { expect } from "@playwright/test";

import type { UiScenario } from "../uiBrowserFixture";
import type { WorkingShipment } from "../../../src/app/modules/warehouse/shipment-management/model/shipment.dto";

export async function checkShipmentEditor(
	{ page, base }: Pick<UiScenario, "page" | "base">,
	working: WorkingShipment,
	orderPath: string,
	changeSaveStatus: (status: number) => void,
) {
	let issued = false;

	await page.route(`**/api/v1${orderPath}/share-link`, async (route) => {
		if (route.request().method() === "DELETE") {
			working.share_link = null;
			await route.fulfill({ status: 204 });
			return;
		}
		expect(route.request().headers()["idempotency-key"]).toBeTruthy();
		const expires_at = route.request().postDataJSON().expires_at;
		working.share_link = { expires_at };
		issued = true;
		await route.fulfill({
			status: 201,
			json: { expires_at, url: `${base}/shipments#token=issued-token` },
		});
	});
	let uploadStatus = 413;
	await page.route(`**/api/v1${orderPath}/documents`, async (route) => {
		expect(route.request().headers()["content-type"]).toContain(
			"multipart/form-data; boundary=",
		);
		expect(route.request().postData()).toContain("sample.pdf");
		expect(route.request().postData()).toContain("upload_request_id");

		if (uploadStatus === 413)
			return route.fulfill({
				status: 413,
				json: { code: "FILE_TOO_LARGE" },
			});
		const original = working.documents[0];

		if (!original) throw new Error("Missing document fixture");

		const document = {
			...original,
			id: "new-document",
			name: "Тестовый файл",
			published: false,
		};
		working.documents.push(document);
		await route.fulfill({ status: 201, json: document });
	});
	await page.route(
		`**/api/v1${orderPath}/documents/new-document`,
		async (route) => {
			const document = working.documents.find(
				(row: { id: string }) => row.id === "new-document",
			);
			if (!document) throw new Error("Missing uploaded document");

			document.published = route.request().postDataJSON().published;
			await route.fulfill({ json: document });
		},
	);
	await page.goto(
		`${base}/warehouses/warehouse-demo/outbound/order-out-2087/shipment`,
	);
	await expect(
		page.getByRole("heading", { name: "Отгрузка · ЗК-2087" }),
	).toBeVisible();
	await page.getByRole("combobox", { name: "Складской приоритет" }).click();
	await page.getByRole("option", { name: "Обычный", exact: true }).click();
	const reason = page.getByLabel("Публичная причина задержки");
	await reason.fill("Локальный черновик отгрузки");
	changeSaveStatus(412);
	await page.getByRole("button", { name: "Сохранить отгрузку" }).click();
	await expect(
		page.getByRole("alert").filter({ hasText: "Версия отгрузки изменилась" }),
	).toBeVisible();
	await page
		.getByRole("button", { name: "Обновить данные", exact: true })
		.click();
	await expect(reason).toHaveValue("Локальный черновик отгрузки");
	await page
		.getByRole("button", { name: "Заменить черновик текущими данными" })
		.click();
	changeSaveStatus(200);
	await page.getByRole("combobox", { name: "Складской приоритет" }).click();
	await page.getByRole("option", { name: "Обычный", exact: true }).click();
	await page.getByRole("button", { name: "Сохранить отгрузку" }).click();
	await expect(page.getByText("Изменения сохранены.")).toBeVisible();
	await page.getByRole("button", { name: "Перевыпустить ссылку" }).click();
	await page.getByRole("button", { name: "Подтвердить" }).click();
	await expect(page.getByLabel("Ссылка для клиента")).toHaveValue(
		`${base}/shipments#token=issued-token`,
	);
	expect(issued).toBe(true);
	await page
		.getByRole("button", { name: "Отозвать ссылку из карточки" })
		.click();
	await page.getByRole("button", { name: "Подтвердить" }).click();
	await expect(page.getByText("Действующей ссылки нет.")).toBeVisible();
	await page.getByLabel("Название", { exact: true }).fill("Тестовый файл");
	await page.getByLabel("Файл", { exact: true }).setInputFiles({
		name: "sample.pdf",
		mimeType: "application/pdf",
		buffer: Buffer.from("sample"),
	});
	await page.getByRole("button", { name: "Загрузить документ" }).click();
	await expect(
		page
			.getByRole("alert")
			.filter({ hasText: "Размер файла превышает 20 МиБ" }),
	).toBeVisible();
	await expect(page.getByLabel("Название", { exact: true })).toHaveValue(
		"Тестовый файл",
	);
	uploadStatus = 201;
	await page.getByRole("button", { name: "Загрузить документ" }).click();
	const row = page.getByRole("row").filter({ hasText: "Тестовый файл" });
	await row
		.getByRole("button", { name: /^Опубликовать Тестовый файл, версия / })
		.click();
	await expect(
		row.getByRole("button", {
			name: /^Снять с публикации Тестовый файл, версия /,
		}),
	).toBeVisible();

	let unknownIssues = 0;
	await page.route(`**/api/v1${orderPath}/share-link`, async (route) => {
		if (route.request().method() !== "POST") return route.fallback();

		unknownIssues++;
		working.share_link = {
			expires_at: route.request().postDataJSON().expires_at,
		};

		return route.abort("connectionreset");
	});
	await page
		.getByRole("button", { name: "Выпустить ссылку", exact: true })
		.click();
	await expect(
		page.getByRole("alert").filter({ hasText: "Исход неизвестен" }),
	).toBeVisible();
	await page.reload();
	await expect(
		page.getByRole("alert").filter({ hasText: "Исход неизвестен" }),
	).toBeVisible();
	await expect(
		page.getByRole("button", { name: "Перевыпустить ссылку", exact: true }),
	).toBeDisabled();
	expect(unknownIssues).toBe(1);
}
