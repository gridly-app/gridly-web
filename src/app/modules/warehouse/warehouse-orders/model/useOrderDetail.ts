import { useState } from "react";
import type { CommandExecutor, Order } from "@/domain/warehouse";
import { errorMessage, formText, useSingleFlight } from "@/shared/lib";
import { actionLabels } from "../config/orderActions";
import type { OrderScreenWarehouse } from "./warehouseFields";

export interface OrderDetailOptions {
	o: Order;
	w: OrderScreenWarehouse;
	command: CommandExecutor;
	pending: boolean;
	onEdit?: (() => void) | undefined;
}

export function useOrderDetail({
	o: order,
	command,
	pending,
	onEdit,
}: OrderDetailOptions) {
	const [reasonAction, setReasonAction] = useState("");
	const [error, setError] = useState("");
	const flight = useSingleFlight();
	const saving = flight.isRunning;
	const executeAction: CommandExecutor = async (action, ...args) => {
		if (pending) return;

		await flight.run(async () => {
			setError("");

			try {
				await command(action, ...args);
			} catch (error) {
				setError(errorMessage(error));
			}
		});
	};
	const actions = order.allowedActions || [];
	const canEdit = actions.includes("edit");
	function runOrderAction(action: string) {
		if (["abort", "write-off-expired"].includes(action)) {
			setReasonAction(action);
		} else {
			void executeAction("orderAction", {
				id: order.id,
				action,
				revision: order.revision,
			});
		}
	}

	async function handleSubmit(data: FormData) {
		await command("orderAction", {
			id: order.id,
			action: reasonAction,
			revision: order.revision,
			reason: formText(data, "reason"),
		});
		setReasonAction("");
	}

	const specificConfirm =
		order.kind === "inbound" ? "confirm-unload" : "confirm-load";
	const visibleActions = [];

	for (const action of actions) {
		const label = actionLabels[action];

		if (!label || (actions.includes("confirm") && action === specificConfirm))
			continue;

		visibleActions.push({ id: action, label });
	}

	function confirmTask(
		task: NonNullable<Order["tasks"]>[number],
		action: string,
	) {
		return executeAction("taskAction", {
			orderId: order.id,
			id: task.id,
			action,
			revision: task.revision,
		});
	}

	function confirmOrder() {
		return executeAction("orderAction", {
			id: order.id,
			action: "confirm",
			revision: order.revision,
		});
	}

	function closeReason() {
		setReasonAction("");
	}

	return {
		confirmOrder,
		confirmLabel:
			order.kind === "inbound"
				? "Подтвердить разгрузку"
				: "Подтвердить погрузку",
		closeReason,
		canConfirm: actions.includes("confirm"),
		reasonLabel: actionLabels[reasonAction],
		canEdit,
		confirmTask,
		visibleActions,
		onEdit,
		pending: pending || saving,
		runOrderAction,
		error,
		reasonAction,
		handleSubmit,
	};
}
