import { expect } from "@playwright/test";
import type { UiScenario } from "../uiBrowserFixture";

export async function routeDragScenario({
	page,
	api,
	ready,
	signIn,
}: UiScenario) {
	const cells = [
		{ x: 6, y: 5, kind: "receiving" },
		{ x: 7, y: 5, kind: "aisle" },
		{ x: 8, y: 5, kind: "aisle" },
		{ x: 9, y: 5, kind: "storage_general" },
		{ x: 6, y: 6, kind: "aisle" },
		{ x: 7, y: 6, kind: "aisle" },
		{ x: 8, y: 6, kind: "aisle" },
	];
	api.accountStore.set("/api/v1/warehouses/warehouse-demo/layout", {
		version: 1,
		width: 16,
		height: 11,
		cells: cells.map((cell) => ({ ...cell, capacity_volume: "0" })),
		routes: [
			{
				id: "9,5",
				keys: ["9,5"],
				inbound: [
					{ x: 6, y: 5 },
					{ x: 7, y: 5 },
					{ x: 8, y: 5 },
				],
				outbound: [],
			},
		],
	});

	await signIn();
	await ready("map");
	await page
		.getByRole("button", { name: "Режим просмотра", exact: true })
		.click();
	await page
		.getByRole("button", { name: "Редактирование", exact: true })
		.click();
	await page
		.getByRole("menuitem", { name: "Настройка путей", exact: true })
		.click();
	const canvas = page.locator("canvas[data-map-width]");
	const cell = (x: number, y: number, relative = false) =>
		canvas.evaluate(
			(element, point) => {
				const box = element.getBoundingClientRect();
				const size = (box.width - 48) / Number(element.dataset.mapWidth);
				return {
					x: (point.relative ? 0 : box.left) + 32 + (point.x + 0.5) * size,
					y: (point.relative ? 0 : box.top) + 32 + (point.y + 0.5) * size,
				};
			},
			{ x, y, relative },
		);
	const previewPixel = () =>
		canvas.evaluate((element) => {
			if (!(element instanceof HTMLCanvasElement))
				throw new Error("The map element is not a canvas");
			const box = element.getBoundingClientRect();
			const size = (box.width - 48) / Number(element.dataset.mapWidth);
			const context = element.getContext("2d");
			if (!context) throw new Error("The map does not have a 2D context");
			const ratio = element.width / box.width;
			return Array.from(
				context.getImageData(
					Math.round((32 + 7.5 * size) * ratio),
					Math.round((32 + 6.5 * size) * ratio),
					1,
					1,
				).data,
			);
		});

	const selectedCell = page.getByText("ВЫБРАННАЯ КЛЕТКА", { exact: true });
	await expect
		.poll(async () => {
			if (await selectedCell.isVisible()) return true;
			await canvas.click({ position: await cell(9, 5, true) });
			return selectedCell.isVisible();
		})
		.toBe(true);
	const basePixel = await previewPixel();
	const start = await cell(7, 5);
	await page.mouse.move(start.x, start.y);
	await page.mouse.down();
	const preview = await cell(7, 6);
	await page.mouse.move(preview.x, preview.y);
	await expect.poll(previewPixel).not.toEqual(basePixel);

	const invalid = await cell(9, 5);
	await page.mouse.move(invalid.x, invalid.y);
	await expect(
		page.getByText("Между выбранными точками нет прохода"),
	).toBeVisible();
	await expect.poll(previewPixel).toEqual(basePixel);
	await page.mouse.up();
	console.log("PASS an invalid route drag clears the last valid preview");
}
