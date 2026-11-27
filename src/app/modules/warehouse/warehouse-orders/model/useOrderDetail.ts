import { useState } from "react";

import type { CommandExecutor, Order } from "@/domain/warehouse";
import { errorMessage, formText, useSingleFlight } from "@/shared/lib";

import { actionLabels } from "../config/orderActions";

type OrderTask = NonNullable<Order["tasks"]>[number];

export interface OrderDetailOptions {
	order: Order;
	command: CommandExecutor;
	pending: boolean;
	onEdit?: (() => void) | undefined;
}

const reasonActions = ["abort", "write-off-expired"];

function visibleOrderActions(order: Order, actions: string[]) {
	const specificConfirm =
		order.kind === "inbound" ? "confirm-unload" : "confirm-load";
	const hasGenericConfirm = actions.includes("confirm");

	return actions.flatMap((action) => {
		const label = actionLabels[action];

		if (!label || (hasGenericConfirm && action === specificConfirm)) return [];

		return [{ id: action, label }];
	});
}

export function useOrderDetail({
	order,
	command,
	pending,
	onEdit,
}: OrderDetailOptions) {
	const [reasonAction, setReasonAction] = useState("");
	const [error, setError] = useState("");
	const flight = useSingleFlight();
	const actions = order.allowedActions ?? [];

	const executeAction: CommandExecutor = async (action, ...args) => {
		if (pending) return;

		await flight.run(async () => {
			setError("");

			try {
				await command(action, ...args);
			} catch (actionError) {
				setError(errorMessage(actionError));
			}
		});
	};

	function runOrderAction(action: string) {
		if (reasonActions.includes(action)) {
			setReasonAction(action);

			return;
		}

		void executeAction("orderAction", {
			id: order.id,
			action,
			revision: order.revision,
		});
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

	function confirmTask(task: OrderTask, action: string) {
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
		canEdit: actions.includes("edit"),
		canConfirm: actions.includes("confirm"),
		confirmLabel:
			order.kind === "inbound"
				? "Подтвердить разгрузку"
				: "Подтвердить погрузку",
		visibleActions: visibleOrderActions(order, actions),
		reasonAction,
		reasonLabel: actionLabels[reasonAction],
		pending: pending || flight.isRunning,
		error,
		onEdit,
		runOrderAction,
		confirmOrder,
		confirmTask,
		closeReason,
		handleSubmit,
	};
}
