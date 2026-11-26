import { useState } from "react";

import type { Warehouse } from "@/domain/warehouse";
import { useWarehouseResources } from "@/ports/warehouse";
import { isAccessDenied } from "@/shared/http";
import { errorMessage } from "@/shared/lib";
import { ListFilters } from "@/shared/ui/dataDisplay";
import { Feedback, RetryButton } from "@/shared/ui/feedback";
import { Select } from "@/shared/ui/forms";
import { managementStyles as styles } from "@/shared/ui/management";

import {
	activeFilterCount,
	filterOrders,
	isKindFilter,
	type KindFilter,
	kindOptions,
	orderStatusOptions,
} from "./model/orderFilters";
import { WarehouseOrdersTable } from "./ui/WarehouseOrdersTable/WarehouseOrdersTable";

export function Orders({ warehouse }: { warehouse: Warehouse }) {
	const query = useWarehouseResources(warehouse, ["orders"]);
	const [search, setSearch] = useState("");
	const [kind, setKind] = useState<KindFilter>("all");
	const [status, setStatus] = useState("all");
	const isDenied = isAccessDenied(query.error);
	const orders = isDenied ? [] : (query.data?.orders ?? []);
	const filters = { search, kind, status };
	const statusOptions = orderStatusOptions(orders);
	const filterCount = activeFilterCount(filters);
	const rows = filterOrders(orders, filters);
	const canShowOrders = Boolean(query.data) && !isDenied;
	const hasRefreshError = canShowOrders && !!query.error;

	function handleKindChange(value: string) {
		if (isKindFilter(value)) setKind(value);
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
			{query.error && !hasRefreshError && (
				<Feedback tone="error" action={<RetryButton onRetry={query.retry} />}>
					{errorMessage(query.error)}
				</Feedback>
			)}
			{hasRefreshError && (
				<Feedback tone="warning" action={<RetryButton onRetry={query.retry} />}>
					Не удалось обновить заказы. Показаны последние загруженные данные.
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
