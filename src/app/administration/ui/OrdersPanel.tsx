import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { type Order, statusLabels, type Warehouse } from "@/domain/warehouse";
import {
	StatusBadge,
	useWarehouseResources,
	useWarehouses,
} from "@/ports/warehouse";
import { errorMessage } from "@/shared/lib";
import { ListFilters } from "@/shared/ui/dataDisplay";
import { Feedback, RetryButton } from "@/shared/ui/feedback";
import { Combobox, Select } from "@/shared/ui/forms";
import { Link } from "@/shared/ui/navigation";
import styles from "../Administration.module.css";
import { adminSearch } from "../model/adminSearch";
import { adminMoment } from "../model/auditPresentation";
import { SortedAdminTable } from "./AdminTable";

const kinds = { inbound: "Приёмка", outbound: "Отгрузка" };
const statusLabel = (status: string) => statusLabels[status] ?? status;

export function OrdersPanel() {
	const query = useWarehouses();
	const [params, setParams] = useSearchParams();
	const warehouseId = params.get("warehouse_id") ?? query.data?.[0]?.id ?? "";
	const warehouse = query.data?.find((row) => row.id === warehouseId);

	return (
		<section className={styles.panel} aria-label="Заказы">
			{query.isPending && <Feedback tone="loading">Загружаем склады…</Feedback>}
			{query.error && (
				<Feedback tone="error" action={<RetryButton onRetry={query.refetch} />}>
					{errorMessage(query.error)}
				</Feedback>
			)}
			{query.isSuccess && (
				<Combobox
					className={styles.warehouseSelect}
					aria-label="Склад"
					value={warehouse?.id ?? ""}
					onValueChange={(value) =>
						setParams({ tab: "orders", warehouse_id: value })
					}
					options={query.data.map(({ id, name }) => ({
						value: id,
						label: name,
					}))}
				/>
			)}
			{warehouse && (
				<WarehouseOrders key={warehouse.id} warehouse={warehouse} />
			)}
		</section>
	);
}

function WarehouseOrders({ warehouse }: { warehouse: Warehouse }) {
	const query = useWarehouseResources(warehouse, ["orders"]);
	const [search, setSearch] = useState("");
	const [kind, setKind] = useState("all");
	const [status, setStatus] = useState("all");
	const matches = adminSearch(search);
	const orders = query.warehouse.orders;
	const statuses = [...new Set(orders.map((order) => order.status))];
	const rows = orders.filter(
		(order) =>
			(kind === "all" || order.kind === kind) &&
			(status === "all" || order.status === status) &&
			matches([
				order.number,
				order.party,
				statusLabel(order.status),
				kinds[order.kind],
			]),
	);

	return (
		<>
			<ListFilters
				search={{
					"aria-label": "Поиск по заказам",
					value: search,
					onChange: setSearch,
				}}
				count={Number(kind !== "all") + Number(status !== "all")}
				onReset={() => {
					setKind("all");
					setStatus("all");
				}}
			>
				<Select
					aria-label="Тип заказа"
					value={kind}
					onValueChange={setKind}
					options={[
						{ value: "all", label: "Все типы" },
						...Object.entries(kinds).map(([value, label]) => ({
							value,
							label,
						})),
					]}
				/>
				<Select
					aria-label="Статус заказа"
					value={status}
					onValueChange={setStatus}
					options={[
						{ value: "all", label: "Все статусы" },
						...statuses.map((value) => ({ value, label: statusLabel(value) })),
					]}
				/>
			</ListFilters>
			{query.loading && <Feedback tone="loading">Загружаем заказы…</Feedback>}
			{query.error && (
				<Feedback tone="error" action={<RetryButton onRetry={query.retry} />}>
					{errorMessage(query.error)}
				</Feedback>
			)}
			{query.hasData && !query.error && (
				<>
					<SortedAdminTable<Order>
						label="Заказы склада"
						rows={rows}
						rowKey={(row) => row.id}
						columns={[
							{
								label: "Номер",
								value: (row) => row.number,
								cell: (row) => (
									<Link
										to={`?${new URLSearchParams({ tab: "orders", warehouse_id: warehouse.id, order: row.id })}`}
									>
										{row.number}
									</Link>
								),
							},
							{ label: "Тип", value: (row) => kinds[row.kind] },
							{ label: "Контрагент", value: (row) => row.party },
							{
								label: "Статус",
								value: (row) => statusLabel(row.status),
								cell: (row) => <StatusBadge value={row.status} />,
							},
							{
								label: "Создан",
								value: (row) => Date.parse(row.created),
								cell: (row) => adminMoment(row.created, warehouse.timezone),
							},
							{
								label: "Действия",
								cell: (row) =>
									row.kind === "outbound" && (
										<div className={styles.actions}>
											<Link
												to={`?tab=system&${new URLSearchParams({ warehouse_id: warehouse.id, order_id: row.id })}`}
											>
												Диагностика
											</Link>
											<Link
												to={`?tab=links&${new URLSearchParams({ warehouse_id: warehouse.id, order_id: row.id })}`}
											>
												Гостевой доступ
											</Link>
										</div>
									),
							},
						]}
					/>
					<div className={styles.pagination}>
						<span role="status">Найдено заказов: {rows.length}</span>
					</div>
				</>
			)}
		</>
	);
}
