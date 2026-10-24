import { useState } from "react";
import type { CommandExecutor, Order, Warehouse } from "@/entities/warehouse";
import { errorMessage, formText } from "@/shared/lib";
import { actionLabels } from "../config/orderActions";

export interface OrderDetailOptions {
	o: Order;
	w: Warehouse;
	command: CommandExecutor;
	pending: boolean;
	onEdit?: () => void;
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
	const actions =
		order.allowedActions ||
		(["draft", "blocked"].includes(order.status)
			? ["start", "cancel"]
			: ["waiting", "running"].includes(order.status)
				? ["cancel"]
				: []);

	const canEdit =
		order.status === "draft" &&
		(order.allowedActions === undefined || actions.includes("edit"));
	function runOrderAction(action: string) {
		if (["abort", "write-off-expired"].includes(action)) {
			setReasonAction(action);
		} else if (order.allowedActions) {
			void executeAction("orderAction", {
				id: order.id,
				action,
				revision: order.revision,
			});
		} else {
			void executeAction(action as "start" | "cancel", order.id);
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
		return executeAction("confirm", order.id);
	}

	function closeReason() {
		setReasonAction("");
	}

	return {
		confirmOrder,
		closeReason,
		canConfirm: order.status === "waiting" && !order.allowedActions,
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
