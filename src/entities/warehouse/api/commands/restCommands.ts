import type { HttpClient, RequestOptions } from "@/shared/api";
import type { WarehouseCommand } from "../../model/commands/commands";
import type { Warehouse } from "../../model/warehouse/schemas";
import { saveCategory, saveProduct } from "./catalog";
import type { RestCommandContext, SendMutation } from "./context";
import { writeOffStock } from "./inventory";
import { discardLayout, saveLayout } from "./layout";
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
		const base = `/warehouses/${encodeURIComponent(id)}`;
		const send = (
			path: string,
			body?: unknown,
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

		switch (command.action) {
			case "routes":
				throw new Error(
					"Сохранение маршрутов пока доступно только в демо: сервер не предоставляет этот API.",
				);
			case "resize":
				throw new Error(
					"Текущий REST API не поддерживает изменение размера склада. Оно доступно в демо.",
				);
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
				throw new Error("Выберите конкретное подтверждение в карточке заказа");
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
			case "draft":
			case "publish":
				return saveLayout(context, command);
			case "discard":
				return discardLayout(context, command);
			case "zone":
				throw new Error(
					"Сохранение зон пока доступно только в демо: сервер не предоставляет этот API.",
				);
		}
	}
}
