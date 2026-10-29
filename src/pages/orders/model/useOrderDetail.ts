import { useState } from "react";
import type { CommandExecutor, Order, Warehouse } from "@/entities/warehouse";
import { errorMessage, formText } from "@/shared/lib";
import { actionLabels } from "../config/orderActions";

export interface OrderDetailOptions {
	o: Order;
	w: Warehouse;
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
	const executeAction: CommandExecutor = async (action, ...args) => {
		try {
			setError("");
			await command(action, ...args);
		} catch (e) {
			setError(errorMessage(e));
		}
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

	const visibleActions = actions
		.filter((action) => actionLabels[action])
		.map((action) => ({
			id: action,
			label: actionLabels[action],
		}));

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
		closeReason,
		canConfirm: actions.includes("confirm"),
		reasonLabel: actionLabels[reasonAction],
		canEdit,
		confirmTask,
		visibleActions,
		onEdit,
		pending,
		runOrderAction,
		error,
		reasonAction,
		handleSubmit,
	};
}
