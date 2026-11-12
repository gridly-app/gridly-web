import { useState } from "react";
import type { Order, Warehouse } from "@/entities/warehouse";
import {
	Table,
	TableBody,
	TableHead,
	TableHeader,
	TableRow,
} from "@/shared/ui/dataDisplay";
import type { useOrderSelection } from "../../model/useOrderSelection";
import type { useOrdersPage } from "../../model/useOrdersPage";
import { OrderRow } from "./OrderRow";

export interface OrdersTableProps {
	warehouse: Warehouse;
	hiddenColumns: readonly number[];
	orders: ReturnType<typeof useOrdersPage>["visibleOrders"];
	kind: Order["kind"];
	pending: boolean;
	onDetail: ReturnType<typeof useOrderSelection>["setDetail"];
	onStart: ReturnType<typeof useOrdersPage>["startOrder"];
	onConfirm: ReturnType<typeof useOrdersPage>["confirmOrder"];
}

export function OrdersTable({
	orders,
	kind,
	pending,
	onDetail,
	onStart,
	onConfirm,
	warehouse,
	hiddenColumns,
}: OrdersTableProps) {
	const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
	function toggleOrder(id: string) {
		setExpanded((current) => {
			const next = new Set(current);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	}

	return (
		<Table hiddenColumns={hiddenColumns}>
			<TableHeader>
				<TableRow>
					<TableHead>Заказ</TableHead>
					<TableHead>
						{kind === "inbound" ? "Поставщик" : "Получатель"}
					</TableHead>
					<TableHead>Товаров</TableHead>
					<TableHead>Стоимость</TableHead>
					<TableHead>Создан</TableHead>
					<TableHead>Статус</TableHead>
					<TableHead>Действия</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{orders.map((order) => (
					<OrderRow
						key={order.id}
						order={order}
						warehouse={warehouse}
						expanded={expanded.has(order.id)}
						pending={pending}
						onToggle={() => toggleOrder(order.id)}
						onDetail={onDetail}
						onStart={onStart}
						onConfirm={onConfirm}
					/>
				))}
			</TableBody>
		</Table>
	);
}
