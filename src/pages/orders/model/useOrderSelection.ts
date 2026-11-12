import { useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
	type CommandExecutor,
	type OrderInput,
	useOrder,
	type Warehouse,
} from "@/entities/warehouse";
import { errorMessage } from "@/shared/lib";

export function useOrderSelection(
	warehouse: Warehouse,
	execute: CommandExecutor,
) {
	const [params, setParams] = useSearchParams();
	const detail = params.get("order");
	const detailGeneration = useRef(0);
	const [editing, setEditing] = useState(false);
	const orderQuery = useOrder(warehouse.id, detail);
	const selected = orderQuery.supported
		? orderQuery.data
		: warehouse.orders.find((order) => order.id === detail);

	function setDetail(id: string | null, highlightUnpriced = false) {
		detailGeneration.current++;
		setParams(
			(current) => {
				const next = new URLSearchParams(current);
				if (id) next.set("order", id);
				else {
					next.delete("order");
					next.delete("highlight");
				}
				if (highlightUnpriced) next.set("highlight", "unpriced");
				return next;
			},
			{ replace: true },
		);
		setEditing(false);
	}
	function closeOrder() {
		setDetail(null);
	}
	async function saveDraft(order: OrderInput) {
		const generation = detailGeneration.current;
		await execute("order", order);
		if (generation === detailGeneration.current) setEditing(false);
	}
	return {
		setDetail,
		selected,
		editing,
		closeOrder,
		saveDraft,
		fetching: orderQuery.isFetching || orderQuery.isError,
		detailOpen: detail !== null,
		detailError: orderQuery.error ? errorMessage(orderQuery.error) : "",
		retryDetail: () => {
			void orderQuery.refetch();
		},
		editSelected: () => setEditing(true),
	};
}
