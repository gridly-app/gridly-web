import { expect, test } from "bun:test";
import { MemoryRouter } from "react-router-dom";

import type { Order } from "@/domain/warehouse";
import {
	type WarehouseData,
	WarehouseDataProvider,
	WarehouseUiProvider,
} from "@/ports/warehouse";
import { ApiError } from "@/shared/http";

import { renderDom } from "../../../../tests/support/rtl";
import { warehouse } from "../../../../tests/support/warehouse";
import { warehouseData } from "../warehouse-data/model/warehouseData";
import * as warehouseUi from "../warehouse-ui";

import { Orders } from "./Orders";

type OrdersState = "loading" | "denied" | "success" | "stale" | "empty";

test("orders shows loading, hides stale data on denial and restores the list on retry", async () => {
	const snapshot = warehouse();
	const order: Order = {
		id: "order-1",
		number: "IN-100",
		kind: "inbound",
		party: "Поставщик",
		status: "draft",
		created: "2026-11-12T00:00:00Z",
		lines: [],
		manual: snapshot.policy,
	};
	let retries = 0;
	let state: OrdersState = "loading";
	const errors: Partial<Record<OrdersState, Error>> = {
		denied: new ApiError("Private data", 403),
		stale: new TypeError("Failed to fetch"),
	};
	const data: WarehouseData = {
		...warehouseData,
		useWarehouseResources(current) {
			return {
				warehouse: { ...current, orders: state === "empty" ? [] : [order] },
				hasData: state !== "loading",
				loading: state === "loading",
				error: errors[state],
				fetching: state === "loading",
				retry: async () => {
					retries++;
				},
			};
		},
	};

	function ordersPage() {
		return (
			<MemoryRouter>
				<WarehouseDataProvider value={data}>
					<WarehouseUiProvider value={warehouseUi}>
						<Orders warehouse={snapshot} />
					</WarehouseUiProvider>
				</WarehouseDataProvider>
			</MemoryRouter>
		);
	}

	const result = await renderDom(ordersPage());

	try {
		expect(result.getByRole("status").textContent).toContain(
			"Загружаем заказы",
		);
		expect(result.queryByRole("link", { name: "IN-100" })).toBeNull();

		state = "denied";
		result.rerender(ordersPage());
		expect(result.getByRole("alert").textContent).toContain("У вас нет прав");
		expect(result.queryByRole("link", { name: "IN-100" })).toBeNull();

		await result.user.click(result.getByRole("button", { name: "Повторить" }));
		expect(retries).toBe(1);

		state = "success";
		result.rerender(ordersPage());
		expect(
			result.getByRole("link", { name: "IN-100" }).getAttribute("href"),
		).toContain("order=order-1");

		state = "stale";
		result.rerender(ordersPage());
		expect(result.getByRole("link", { name: "IN-100" })).toBeTruthy();
		expect(
			result.getByText(
				"Не удалось обновить заказы. Показаны последние загруженные данные.",
			),
		).toBeTruthy();

		state = "empty";
		result.rerender(ordersPage());
		expect(result.getByRole("status").textContent).toContain(
			"Найдено заказов: 0",
		);
		expect(result.queryByRole("link", { name: "IN-100" })).toBeNull();
	} finally {
		await result.close();
	}
});
