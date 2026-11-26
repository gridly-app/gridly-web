import { expect, test } from "bun:test";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { waitFor } from "@testing-library/react/pure";
import { act } from "react";
import { MemoryRouter } from "react-router-dom";

import { WarehouseDataProvider } from "@/ports/warehouse";
import { ApiError } from "@/shared/http";
import { httpDouble } from "../../../../tests/support/http";
import { renderDom } from "../../../../tests/support/rtl";
import { RestWarehouseRepository } from "../warehouse-data/api/repositories/restRepository";
import { warehouseData } from "../warehouse-data/model/warehouseData";
import { WarehouseRepositoryProvider } from "../warehouse-data/WarehouseRepositoryProvider";
import { Users } from "./Users";

const users = {
	allowed_actions: [],
	permission_catalog: [
		{ code: "warehouse.view", label: "Просмотр склада", group: "Просмотр" },
	],
	manageable_warehouse_ids: ["warehouse-demo"],
	items: [
		{
			id: "user-operator",
			name: "Иван Петров",
			login: "operator@gridly.local",
			kind: "account",
			revision: 1,
			warehouses: [
				{
					warehouse_id: "warehouse-demo",
					warehouse_name: "Центральный склад",
					permissions: ["warehouse.view"],
				},
			],
			allowed_actions: ["edit-profile", "edit-memberships"],
		},
	],
};

async function renderUsers(refreshError: () => Error | null) {
	const client = new QueryClient();
	const http = {
		request: async () => {
			const error = refreshError();

			if (error) throw error;

			return users;
		},
	};
	const repository = new RestWarehouseRepository(httpDouble(http), client);
	const view = await renderDom(
		<QueryClientProvider client={client}>
			<WarehouseRepositoryProvider repository={repository}>
				<WarehouseDataProvider value={warehouseData}>
					<MemoryRouter>
						<Users http={http} userId={null} userKind={undefined} />
					</MemoryRouter>
				</WarehouseDataProvider>
			</WarehouseRepositoryProvider>
		</QueryClientProvider>,
	);

	async function close() {
		await view.close();
		client.clear();
	}

	async function refresh() {
		await act(async () => {
			await client.refetchQueries();
		});
	}

	return { ...view, close, refresh };
}

const userLink = { name: "Иван Петров" };

test("a failed background refresh keeps the loaded users on screen", async () => {
	let error: Error | null = null;
	const view = await renderUsers(() => error);

	try {
		await view.findByRole("link", userLink);
		error = new TypeError("Failed to fetch");
		await view.refresh();

		expect(
			await view.findByText(
				"Не удалось обновить список. Показаны последние загруженные данные.",
			),
		).toBeTruthy();
		expect(view.getByRole("link", userLink)).toBeTruthy();
		expect(
			view.getByRole("button", {
				name: "Изменить доступ: Иван Петров (operator@gridly.local)",
			}),
		).toBeTruthy();
	} finally {
		await view.close();
	}
});

test("lost access hides the loaded users", async () => {
	let error: Error | null = null;
	const view = await renderUsers(() => error);

	try {
		await view.findByRole("link", userLink);
		error = new ApiError("Forbidden", 403);
		await view.refresh();

		await waitFor(() => expect(view.queryByRole("link", userLink)).toBeNull());
	} finally {
		await view.close();
	}
});
