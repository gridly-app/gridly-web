import { useState } from "react";

import type { Order, Warehouse } from "@/domain/warehouse";
import { useWarehouseResources } from "@/ports/warehouse";

import { textSearch, errorMessage } from "@/shared/lib";
import { orderKinds, orderStatusLabel } from "./model/orderLabels";

import { ListFilters } from "@/shared/ui/dataDisplay";
import { Feedback, RetryButton } from "@/shared/ui/feedback";
import { Select } from "@/shared/ui/forms";

import { WarehouseOrdersTable } from "./ui/WarehouseOrdersTable/WarehouseOrdersTable";

import { managementStyles as styles } from "@/shared/ui/management";

const kindOptions = [
	{ value: "all", label: "Все типы" },
	...Object.entries(orderKinds).map(([value, label]) => ({ value, label })),
];

export function Orders({ warehouse }: { warehouse: Warehouse }) {
	const query = useWarehouseResources(warehouse, ["orders"]);
	const [search, setSearch] = useState("");
	const [kind, setKind] = useState<"all" | Order["kind"]>("all");
	const [status, setStatus] = useState("all");
	const matches = textSearch(search);
	const orders = query.warehouse.orders;
	const statuses = [...new Set(orders.map((order) => order.status))];
	const statusOptions = [
		{ value: "all", label: "Все статусы" },
		...statuses.map((value) => ({ value, label: orderStatusLabel(value) })),
	];
	const filterCount = Number(kind !== "all") + Number(status !== "all");
	const rows = orders.filter(
		(order) =>
			(kind === "all" || order.kind === kind) &&
			(status === "all" || order.status === status) &&
			matches([
				order.number,
				order.party,
				orderStatusLabel(order.status),
				orderKinds[order.kind],
			]),
	);

	const canShowOrders = query.hasData && !query.error;

	function handleKindChange(value: string) {
		if (value === "all" || value === "inbound" || value === "outbound")
			setKind(value);
	}

	function handleReset() {
		setKind("all");
		setStatus("all");
	}

	return (
		<>
			<ListFilters
				search={{
					"aria-label": "Поиск по заказам",
					value: search,
					onChange: setSearch,
				}}
				count={filterCount}
				onReset={handleReset}
			>
				<Select
					aria-label="Тип заказа"
					value={kind}
					onValueChange={handleKindChange}
					options={kindOptions}
				/>
				<Select
					aria-label="Статус заказа"
					value={status}
					onValueChange={setStatus}
					options={statusOptions}
				/>
			</ListFilters>
			{query.loading && <Feedback tone="loading">Загружаем заказы…</Feedback>}
			{query.error && (
				<Feedback tone="error" action={<RetryButton onRetry={query.retry} />}>
					{errorMessage(query.error)}
				</Feedback>
			)}
			{canShowOrders && (
				<>
					<WarehouseOrdersTable warehouse={warehouse} rows={rows} />
					<p className={styles.subtle} role="status">
						Найдено заказов: {rows.length}
					</p>
				</>
			)}
		</>
	);
}
