import {
	type HttpClient,
	parseResponse,
	type RequestOptions,
} from "@/shared/api";
import { warehouseCommandSchema } from "../../model/commands/commandSchemas";
import type { WarehouseCommand } from "../../model/commands/commands";
import type { Warehouse } from "../../model/warehouse/schemas";
import { warehouseSettingsDto } from "../contracts/contract";
import { saveCategory, saveProduct } from "./catalog";
import {
	type RestCommandContext,
	requireRevision,
	type SendMutation,
} from "./context";
import { writeOffStock } from "./inventory";
import { discardLayout, saveMap } from "./layout";
import {
	applyOrderAction,
	confirmTask,
	runLegacyOrderAction,
	saveOrder,
} from "./orders";
import { deleteRobot, saveRobot } from "./robots";
import { saveSettings, setSimulation } from "./settings";

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
				if (!warehouse.allowedActions?.includes("resize"))
					throw new Error("Изменение размера недоступно по данным сервера");
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
