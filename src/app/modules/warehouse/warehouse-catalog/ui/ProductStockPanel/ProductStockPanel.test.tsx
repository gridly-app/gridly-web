import { expect, test } from "bun:test";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act } from "react";

import { WarehouseDataProvider } from "@/ports/warehouse";
import { ApiError } from "@/shared/http";

import { httpDouble } from "../../../../../../../tests/support/http";
import { renderDom } from "../../../../../../../tests/support/rtl";
import { warehouse } from "../../../../../../../tests/support/warehouse";
import { RestWarehouseRepository } from "@/app/modules/warehouse-data/api/repositories/restRepository";
import { warehouseDto } from "@/app/modules/warehouse-data/api/repositories/warehouseRepository.test-support";
import { warehouseData } from "@/app/modules/warehouse-data/model/warehouseData";
import { WarehouseRepositoryProvider } from "@/app/modules/warehouse-data/WarehouseRepositoryProvider";

import { ProductStockPanel } from "./ProductStockPanel";

test("batches remain visible through a failed layout read and acquire zone names on retry", async () => {
	const snapshot = warehouse();
	const first = Promise.withResolvers<unknown>();
	const cache = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});
	const layout = {
		version: 1,
		width: 3,
		height: 3,
		cells: [
			{
				x: 1,
				y: 1,
				kind: "storage_general",
				capacity_volume: 10,
				zone: { id: "storage", name: "Основное хранение", categoryId: "c" },
			},
		],
		routes: [],
	};
	let layoutReads = 0;
	const repository = new RestWarehouseRepository(
		httpDouble({
			async request(path) {
				if (path.endsWith("/layout")) {
					layoutReads++;

					return layoutReads === 1 ? first.promise : layout;
				}

				if (path.endsWith("/layout/draft")) throw new ApiError("No draft", 404);

				return { ...warehouseDto, id: snapshot.id };
			},
		}),
		cache,
	);
	const result = await renderDom(
		<QueryClientProvider client={cache}>
			<WarehouseRepositoryProvider repository={repository}>
				<WarehouseDataProvider value={warehouseData}>
					<ProductStockPanel
						warehouse={snapshot}
						stock={snapshot.stock}
						filters={{ search: "", zone: "all", status: "all" }}
						onChange={() => undefined}
					/>
				</WarehouseDataProvider>
			</WarehouseRepositoryProvider>
		</QueryClientProvider>,
	);

	try {
		expect(result.getByRole("cell", { name: "Ячейка 1,1" })).toBeTruthy();
		expect(result.getByRole("cell", { name: "10 шт." })).toBeTruthy();

		await act(async () => first.reject(new ApiError("Unavailable", 503)));
		await result.findByText("Не удалось загрузить названия зон.");

		expect(result.getByRole("cell", { name: "Ячейка 1,1" })).toBeTruthy();

		await result.user.click(result.getByRole("button", { name: "Повторить" }));
		await result.findByRole("cell", { name: "Основное хранение" });

		expect(result.queryByRole("cell", { name: "Ячейка 1,1" })).toBeNull();
	} finally {
		await result.close();
		repository.clear();
		cache.clear();
	}
});
