import { useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";

import type { CommandExecutor, OrderInput } from "@/domain/warehouse";
import { useOrder } from "@/ports/warehouse";
import {
	errorMessage,
	type SearchParamChanges,
	useUpdateSearchParams,
} from "@/shared/lib";

import type { OrderScreenWarehouse } from "./warehouseResources";

export function useOrderSelection(
	warehouse: Pick<OrderScreenWarehouse, "id">,
	execute: CommandExecutor,
) {
	const [params] = useSearchParams();
	const updateSearchParams = useUpdateSearchParams();
	const detail = params.get("order");
	const detailGeneration = useRef(0);
	const [editing, setEditing] = useState(false);
	const orderQuery = useOrder(warehouse.id, detail);
	const selected = orderQuery.data;

	function setDetail(id: string | null, highlightUnpriced = false) {
		const changes: SearchParamChanges = id
			? { order: id }
			: { order: null, highlight: null };

		detailGeneration.current++;

		if (highlightUnpriced) changes.highlight = "unpriced";

		updateSearchParams(changes);
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

	function retryDetail() {
		void orderQuery.refetch();
	}

	function editSelected() {
		setEditing(true);
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
		retryDetail,
		editSelected,
	};
}
