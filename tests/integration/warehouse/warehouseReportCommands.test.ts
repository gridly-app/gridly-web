import { expect, test } from "bun:test";
import { RestWarehouseCommands } from "@/app/warehouse-data/commands/restCommands";
import { warehouseFromDto } from "@/app/warehouse-data/repositories/restMappers";
import { warehouseDto } from "@/app/warehouse-data/warehouses/warehouseDto";
import type { RequestOptions } from "@/shared/http";
import { requiredAt } from "@/shared/invariants";

import { reportWarehouse as base, payload } from "./reportWarehouse";

test("archive and settings mutations preserve scoped paths and revision preconditions", async () => {
	const calls: { path: string; options: RequestOptions }[] = [];
	const settings = {
		revision: 4,
		location: "Москва",
		low_stock_threshold: 12,
		allocation_policy: "fefo",
	};
	const commands = new RestWarehouseCommands(
		{ request: async () => ({}) },
		async (path, options) => {
			calls.push({ path, options });
			return settings;
		},
	);
	const product = requiredAt(base.products, 0);
	await commands.execute(
		base.id,
		{
			action: "warehouseSettings",
			value: { revision: 3, lowStockThreshold: 12 },
		},
		base,
	);
	expect(calls[0]).toMatchObject({
		path: `/warehouses/${base.id}/settings`,
		options: {
			method: "PATCH",
			body: { revision: 3, low_stock_threshold: 12 },
		},
	});
	await commands.execute(
		base.id,
		{ action: "archiveProduct", value: product.id },
		base,
	);
	expect(calls[1]).toMatchObject({
		path: `/warehouses/${base.id}/products/${encodeURIComponent(product.id)}/archive`,
		options: { method: "POST", body: { revision: product.revision } },
	});
});
test("cabinet values remain warehouse specific in REST fixtures", () => {
	const north = warehouseFromDto(
		warehouseDto.parse(payload("Карточка склада (Северный)")),
	);
	expect(north.id).not.toBe(base.id);
	expect(north.cabinet?.location).toBe(
		"Санкт-Петербург, 3-й Верхний переулок, 6",
	);
	expect(north.cabinet?.lowStockThreshold).toBe(15);
	expect(base.cabinet?.lowStockThreshold).toBe(10);
});
