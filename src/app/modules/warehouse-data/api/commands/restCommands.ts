import type {
	Warehouse,
	WarehouseCommand,
	WarehouseSettings,
} from "@/domain/warehouse";
import { warehouseCommandSchema } from "@/domain/warehouse";
import {
	ApiError,
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
	type CommandResources,
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
		resources: CommandResources,
	): Promise<WarehouseSettings | void> {
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
			resources,
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
				const item = (
					product ? resources.catalog?.products : resources.catalog?.categories
				)?.find((i) => i.id === command.value);
				try {
					await send(
						`/${product ? "products" : "categories"}/${encodeURIComponent(command.value)}/archive`,
						{ revision: requireRevision(item?.revision) },
					);
				} catch (error) {
					if (product || !(error instanceof ApiError) || error.status !== 409)
						throw error;

					switch (error.code) {
						case "CATEGORY_IN_USE_BY_ZONES":
							throw new UserError(
								"Измените зоны этой категории на опубликованной карте и в сохранённом черновике.",
							);
						case "CATEGORY_HAS_PRODUCTS":
							throw new UserError(
								"Перенесите товары в другую категорию перед архивацией.",
							);
						default:
							throw error;
					}
				}
				return;
			}
			case "deleteOrder":
				await remove(
					`/orders/${encodeURIComponent(command.value)}`,
					resources.orders?.orders.find((o) => o.id === command.value)
						?.revision,
				);
				return;
			case "warehouseSettings": {
				const { revision, location, lowStockThreshold } = command.value;
				return parseResponse(
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
			}
			case "saveMap":
				return saveMap(context, command);
			case "resize": {
				const layout = resources.map;

				if (!layout || layout.version !== warehouse.version)
					throw new UserError("Дождитесь синхронизации планировки склада");
				if (layout.draftRevision !== undefined) {
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
			}
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
					value: {
						id: command.value,
						action: "confirm",
						revision: resources.orders?.orders.find(
							(order) => order.id === command.value,
						)?.revision,
					},
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
