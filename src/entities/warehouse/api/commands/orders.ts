import { parseResponse } from "@/shared/api";
import type { WarehouseCommand } from "../../model/commands/commands";
import { orderDto } from "../contracts/contract";
import { policyToDto } from "../contracts/contractMappers";
import type { RestCommandContext } from "./context";
import { requireRevision } from "./context";

async function runOrderAction(
	context: RestCommandContext,
	orderId: string,
	action: string,
	reason?: string | undefined,
	revision?: number | undefined,
) {
	const { http, base, send } = context;
	const o = parseResponse(
		orderDto,
		await http.request(`${base}/orders/${encodeURIComponent(orderId)}`),
	);

	if (!o.allowed_actions?.includes(action)) {
		throw new Error("Действие больше недоступно. Обновите заказ.");
	}
	await send(
		`/orders/${encodeURIComponent(orderId)}/${encodeURIComponent(action)}`,
		{
			revision: requireRevision(revision ?? o.revision),
			...(reason ? { reason } : {}),
		},
	);
}

export async function saveOrder(
	context: RestCommandContext,
	command: Extract<WarehouseCommand, { action: "order" }>,
): Promise<void> {
	const { warehouse, send } = context;
	const order = command.value;
	const existing = warehouse.orders.find((n) => n.id === order.id);

	await send(
		`/orders${existing ? `/${encodeURIComponent(order.id ?? "")}` : ""}`,
		{
			...(existing
				? { revision: requireRevision(order.revision ?? existing.revision) }
				: { kind: order.kind }),
			counterparty_text: order.party.trim(),
			lines: order.lines.map((line) => ({
				...(existing && line.id ? { id: line.id } : {}),
				product_id: line.product,
				quantity: line.quantity,
				...(order.kind === "inbound"
					? { expires_on: line.expires || null }
					: {}),
			})),
			...policyToDto(order.manual),
		},
		existing ? "PATCH" : "POST",
	);
}

export async function runLegacyOrderAction(
	context: RestCommandContext,
	command: Extract<WarehouseCommand, { action: "start" | "cancel" }>,
): Promise<void> {
	const { warehouse } = context;

	await runOrderAction(
		context,
		command.value,
		command.action,
		undefined,
		warehouse.orders.find((order) => order.id === command.value)?.revision,
	);
}

export async function applyOrderAction(
	context: RestCommandContext,
	command: Extract<WarehouseCommand, { action: "orderAction" }>,
): Promise<void> {
	await runOrderAction(
		context,
		command.value.id,
		command.value.action,
		command.value.reason,
		command.value.revision,
	);
}

export async function confirmTask(
	context: RestCommandContext,
	command: Extract<WarehouseCommand, { action: "taskAction" }>,
): Promise<void> {
	const { base, http, send } = context;
	const o = parseResponse(
		orderDto,
		await http.request(
			`${base}/orders/${encodeURIComponent(command.value.orderId)}`,
		),
	);
	const task = o.tasks?.find((t) => t.id === command.value.id);

	if (!task?.allowed_actions?.includes(command.value.action)) {
		throw new Error("Подтверждение задачи недоступно");
	}
	await send(
		`/tasks/${encodeURIComponent(task.id)}/${encodeURIComponent(command.value.action)}`,
		{
			revision: command.value.revision ?? task.revision,
		},
	);
}
