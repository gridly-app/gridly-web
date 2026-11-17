import type { Warehouse, WarehouseCommand } from "@/domain/warehouse";
import { warehouseCommandSchema } from "@/domain/warehouse";
import {
	type HttpClient,
	parseResponse,
	type RequestOptions,
} from "@/shared/http";
import { UserError } from "@/shared/lib";
import { saveCategory, saveProduct } from "../catalog/catalogCommands";
import { writeOffStock } from "../inventory/inventoryCommands";
import { discardLayout, saveMap } from "../layout/saveLayout";
import {
	applyOrderAction,
	confirmTask,
	runLegacyOrderAction,
	saveOrder,
} from "../orders/ordersCommands";
import { deleteRobot, saveRobot } from "../robots/robotsCommands";
import { warehouseSettingsDto } from "../settings/settings.dto.ts";
import { saveSettings, setSimulation } from "../settings/settingsCommands";
import {
	type RestCommandContext,
	requireRevision,
	type SendMutation,
} from "./context";

export class RestWarehouseCommands {
	constructor(
		private readonly http: HttpClient,
		private readonly sendMutation: SendMutation,
	) {}

	async execute(
		id: string,
		command: WarehouseCommand,
		warehouse: Warehouse,
	): Promise<void> {
		command = warehouseCommandSchema.parse(command);
		const base = `/warehouses/${encodeURIComponent(id)}`;
		const send = (
			path: string,
			body?: unknown | undefined,
			method: RequestOptions["method"] = "POST",
			keyed = true,
		) => this.sendMutation(`${base}${path}`, { method, body }, keyed);
		const context: RestCommandContext = {
			base,
			warehouse,
			http: this.http,
			mutate: this.sendMutation,
			send,
		};

		const remove = (path: string, revision: number | undefined) =>
			this.sendMutation(`${base}${path}`, {
				method: "DELETE",
				headers: { "If-Match": `"${requireRevision(revision)}"` },
			});
		switch (command.action) {
			case "deleteWarehouse":
				await remove("", warehouse.revision);
				return;
			case "archiveProduct":
			case "archiveCategory": {
				const product = command.action === "archiveProduct";
				const item = (product ? warehouse.products : warehouse.categories).find(
					(i) => i.id === command.value,
				);
				await send(
					`/${product ? "products" : "categories"}/${encodeURIComponent(command.value)}/archive`,
					{ revision: requireRevision(item?.revision) },
				);
				return;
			}
			case "deleteOrder":
				await remove(
					`/orders/${encodeURIComponent(command.value)}`,
					warehouse.orders.find((o) => o.id === command.value)?.revision,
				);
				return;
			case "warehouseSettings": {
				const { revision, location, lowStockThreshold } = command.value;
				parseResponse(
					warehouseSettingsDto,
					await send(
						"/settings",
						{
							revision,
							...(location !== undefined ? { location } : {}),
							...(lowStockThreshold !== undefined
								? { low_stock_threshold: lowStockThreshold }
								: {}),
						},
						"PATCH",
					),
				);
				return;
			}
			case "saveMap":
				return saveMap(context, command);
			case "resize":
				if (warehouse.draftRevision !== undefined) {
					throw new UserError(
						"Сохраните или удалите черновик планировки перед изменением размера.",
					);
				}
				if (!warehouse.allowedActions?.includes("resize"))
					throw new UserError("Изменение размера недоступно по данным сервера");
				await send("/layout/resize", {
					...command.value,
					base_version: warehouse.version,
				});
				return;
			case "simulation":
				return setSimulation(context, command);
			case "order":
				return saveOrder(context, command);
			case "start":
			case "cancel":
				return runLegacyOrderAction(context, command);
			case "orderAction":
				return applyOrderAction(context, command);
			case "taskAction":
				return confirmTask(context, command);
			case "confirm":
				return applyOrderAction(context, {
					action: "orderAction",
					value: { id: command.value, action: "confirm" },
				});
			case "product":
				return saveProduct(context, command);
			case "category":
				return saveCategory(context, command);
			case "robot":
				return saveRobot(context, command);
			case "deleteRobot":
				return deleteRobot(context, command);
			case "writeoff":
				return writeOffStock(context, command);
			case "settings":
				return saveSettings(context, command);
			case "discard":
				return discardLayout(context, command);
		}
	}
}
