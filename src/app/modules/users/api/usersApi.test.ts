import { expect, test } from "bun:test";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, createElement } from "react";

import { adminQueryKey } from "@/ports/administration";
import { WarehouseDataProvider } from "@/ports/warehouse";
import { ApiError, type RequestOptions } from "@/shared/http";
import { mountDom } from "../../../../../tests/support/dom";
import { httpDouble } from "../../../../../tests/support/http";
import { RestWarehouseRepository } from "../../warehouse-data/api/repositories/restRepository";
import { WarehouseRepositoryProvider } from "../../warehouse-data/WarehouseRepositoryProvider";
import { warehouseData } from "../../warehouse-data/model/warehouseData";
import { useRemoveAdminUser } from "./usersApi";

test.each([200, 403])(
	"scoped membership removal handles server status %d",
	async (status) => {
		const dom = mountDom();
		const client = new QueryClient();
		const requests: { path: string; options: RequestOptions | undefined }[] =
			[];
		const http = {
			request: async (path: string, options?: RequestOptions) => {
				requests.push({ path, options });

				if (status === 403)
					throw new ApiError("Forbidden", status, "FORBIDDEN");

				return {};
			},
		};
		const repository = new RestWarehouseRepository(httpDouble(http), client);
		const key = adminQueryKey(repository.keys.scopeId, "/admin/shipment-users");
		const sandboxKey = adminQueryKey(
			repository.keys.scopeId,
			"/sandbox/admin/shipment-users",
		);
		let removals = 0;
		let mutation: ReturnType<typeof useRemoveAdminUser> | undefined;

		function RemoveMember() {
			mutation = useRemoveAdminUser(http, "standard", () => {
				removals++;
			});

			return null;
		}

		try {
			client.setQueryData(key, { items: ["cached membership"] });
			client.setQueryData(sandboxKey, { items: ["sandbox membership"] });
			act(() =>
				dom.root.render(
					createElement(QueryClientProvider, {
						client,
						children: createElement(WarehouseRepositoryProvider, {
							repository,
							children: createElement(WarehouseDataProvider, {
								value: warehouseData,
								children: createElement(RemoveMember),
							}),
						}),
					}),
				),
			);
			if (!mutation) throw new Error("Membership mutation did not mount");

			const remove = mutation.mutateAsync;

			await act(async () => {
				const result = remove({
					id: "user/1",
					warehouseId: "warehouse/2",
					revision: 7,
				});

				if (status === 403) {
					await expect(result).rejects.toMatchObject({ status: 403 });
					return;
				}

				await result;
			});

			expect(requests).toEqual([
				{
					path: "/admin/shipment-users/user%2F1/warehouses/warehouse%2F2",
					options: { method: "DELETE", headers: { "If-Match": '"7"' } },
				},
			]);
			expect(removals).toBe(status === 200 ? 1 : 0);
			expect(client.getQueryState(key)?.isInvalidated).toBe(true);
			expect(client.getQueryState(sandboxKey)?.isInvalidated).toBe(false);
		} finally {
			await dom.close();
			client.clear();
		}
	},
);
