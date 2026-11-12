import { expect, test } from "bun:test";
import { RestWarehouseCommands } from "@/entities/warehouse/api/commands/restCommands";
import { warehouseDto } from "@/entities/warehouse/api/contracts/warehouseDto";
import { warehouseFromDto } from "@/entities/warehouse/api/repositories/restMappers";
import type { RequestOptions } from "@/shared/api";
import { requiredAt } from "@/shared/lib/requiredAt";

import {
	reportWarehouse as base,
	payload,
} from "../../support/reportWarehouse";

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
		warehouseDto.parse(payload("North: Warehouse details")),
	);
	expect(north.id).not.toBe(base.id);
	expect(north.cabinet?.placement).toBe("fifo");
	expect(base.cabinet?.placement).toBe("fefo");
});
