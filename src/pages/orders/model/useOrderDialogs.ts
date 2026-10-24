import { useState } from "react";
import {
	type CommandExecutor,
	type Order,
	useOrder,
	type Warehouse,
} from "@/entities/warehouse";

export function useOrderDialogs(
	warehouse: Warehouse,
	execute: CommandExecutor,
) {
	const [creating, setCreating] = useState(false);
	const [detail, setDetail] = useState<string | null>(null);
	const [editing, setEditing] = useState(false);
	const orderQuery = useOrder(warehouse.id, detail);
	const selected =
		orderQuery.data || warehouse.orders.find((order) => order.id === detail);

	async function createDraft(order: Order) {
		await execute("order", order);
		setCreating(false);
	}

	function closeOrder() {
		setDetail(null);
		setEditing(false);
	}

	async function saveDraft(order: Order) {
		await execute("order", order);
		setEditing(false);
	}

	return {
		creating,
		setCreating,
		setDetail,
		selected,
		editing,
		closeOrder,
		createDraft,
		saveDraft,
		fetching: orderQuery.isFetching,
		editSelected: () => setEditing(true),
	};
}
