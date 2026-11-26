import type { Order } from "@/domain/warehouse";
import { textSearch } from "@/shared/lib";

import { orderKinds, orderStatusLabel } from "./orderLabels";

export type KindFilter = "all" | Order["kind"];

export type OrderFilters = {
	search: string;
	kind: KindFilter;
	status: string;
};

export const kindOptions: { value: KindFilter; label: string }[] = [
	{ value: "all", label: "Все типы" },
	{ value: "inbound", label: orderKinds.inbound },
	{ value: "outbound", label: orderKinds.outbound },
];

export function isKindFilter(value: string): value is KindFilter {
	return kindOptions.some((option) => option.value === value);
}

export function orderStatusOptions(orders: Order[]) {
	const statuses = [...new Set(orders.map((order) => order.status))];

	return [
		{ value: "all", label: "Все статусы" },
		...statuses.map((value) => ({ value, label: orderStatusLabel(value) })),
	];
}

export function activeFilterCount({ kind, status }: OrderFilters) {
	return Number(kind !== "all") + Number(status !== "all");
}

export function filterOrders(orders: Order[], filters: OrderFilters) {
	const matches = textSearch(filters.search);

	return orders.filter((order) => {
		const isKindMatch = filters.kind === "all" || order.kind === filters.kind;
		const isStatusMatch =
			filters.status === "all" || order.status === filters.status;

		return (
			isKindMatch &&
			isStatusMatch &&
			matches([
				order.number,
				order.party,
				orderStatusLabel(order.status),
				orderKinds[order.kind],
			])
		);
	});
}
