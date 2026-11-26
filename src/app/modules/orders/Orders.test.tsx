import { expect, test } from "bun:test";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act } from "react";
import { MemoryRouter } from "react-router-dom";

import { WarehouseDataProvider, WarehouseUiProvider } from "@/ports/warehouse";
import { ApiError } from "@/shared/http";

import { httpDouble } from "../../../../tests/support/http";
import { renderDom } from "../../../../tests/support/rtl";
import { warehouse } from "../../../../tests/support/warehouse";
import { RestWarehouseRepository } from "../warehouse-data/api/repositories/restRepository";
import { warehouseData } from "../warehouse-data/model/warehouseData";
import { WarehouseRepositoryProvider } from "../warehouse-data/WarehouseRepositoryProvider";
import * as warehouseUi from "../warehouse-ui";

import { Orders } from "./Orders";

test("orders hides cached rows on denial and restores the list on retry", async () => {
	const snapshot = warehouse();
	const first = Promise.withResolvers<unknown>();
	const order = {
		id: "order-1",
		number: "IN-100",
		kind: "inbound",
		counterparty_text: "Поставщик",
		status: "draft",
		allowed_actions: [],
		created_at: "2026-11-12T00:00:00Z",
		lines: [],
	};
	type State = "loading" | "denied" | "success" | "stale" | "empty";
	let state: State = "loading";
	const cache = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});
	const repository = new RestWarehouseRepository(
		httpDouble({
			request: async () => {
				switch (state) {
					case "loading":
						return first.promise;
					case "denied":
						throw new ApiError("Private data", 403);
					case "stale":
						throw new TypeError("Failed to fetch");
					case "success":
						return { items: [order], total: 1 };
					case "empty":
						return { items: [], total: 0 };
				}
			},
		}),
		cache,
	);
	const queryKey = repository.keys.resource(snapshot.id, "orders");
	const result = await renderDom(
		<MemoryRouter>
			<QueryClientProvider client={cache}>
				<WarehouseRepositoryProvider repository={repository}>
					<WarehouseDataProvider value={warehouseData}>
						<WarehouseUiProvider value={warehouseUi}>
							<Orders warehouse={snapshot} />
						</WarehouseUiProvider>
					</WarehouseDataProvider>
				</WarehouseRepositoryProvider>
			</QueryClientProvider>
		</MemoryRouter>,
	);

	try {
		expect(result.getByRole("status").textContent).toContain(
			"Загружаем заказы",
		);
		expect(result.queryByRole("link", { name: "IN-100" })).toBeNull();

		await act(async () => first.resolve({ items: [order], total: 1 }));
		await result.findByRole("link", { name: "IN-100" });

		state = "denied";
		await act(() => cache.invalidateQueries({ queryKey }));
		const denied = await result.findByRole("alert");

		expect(denied.textContent).toContain("У вас нет прав");
		expect(result.queryByRole("link", { name: "IN-100" })).toBeNull();

		state = "success";
		await result.user.click(result.getByRole("button", { name: "Повторить" }));
		const link = await result.findByRole("link", { name: "IN-100" });

		expect(link.getAttribute("href")).toContain("order=order-1");

		state = "stale";
		await act(() => cache.invalidateQueries({ queryKey }));
		await result.findByText(
			"Не удалось обновить заказы. Показаны последние загруженные данные.",
		);
		expect(result.getByRole("link", { name: "IN-100" })).toBeTruthy();

		state = "empty";
		await act(() => cache.invalidateQueries({ queryKey }));
		await result.findByText("Найдено заказов: 0");
		expect(result.queryByRole("link", { name: "IN-100" })).toBeNull();
	} finally {
		await result.close();
		repository.clear();
		cache.clear();
	}
});
