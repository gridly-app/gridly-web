import { useState } from "react";

import type { Order } from "@/domain/warehouse";
import {
	Table,
	TableBody,
	TableHead,
	TableHeader,
	TableRow,
} from "@/shared/ui/dataDisplay";

import type { useOrderSelection } from "../../model/useOrderSelection";
import type { useOrdersPage } from "../../model/useOrdersPage";
import type { OrderScreenWarehouse } from "../../model/warehouseResources";
import { OrderRow } from "../OrderRow/OrderRow";

export function OrdersTable({
	orders,
	kind,
	isPending,
	onDetail,
	onStart,
	onConfirm,
	warehouse,
	hiddenColumns,
}: {
	warehouse: OrderScreenWarehouse;
	hiddenColumns: readonly number[];
	orders: ReturnType<typeof useOrdersPage>["visibleOrders"];
	kind: Order["kind"];
	isPending: boolean;
	onDetail: ReturnType<typeof useOrderSelection>["setDetail"];
	onStart: ReturnType<typeof useOrdersPage>["startOrder"];
	onConfirm: ReturnType<typeof useOrdersPage>["confirmOrder"];
}) {
	const [expanded, setExpanded] = useState<ReadonlySet<string>>(
		() => new Set(),
	);

	function handleToggle(id: string) {
		setExpanded((current) => {
			const next = new Set(current);

			if (!next.delete(id)) next.add(id);

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
					<TableHead data-column="actions">Действия</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{orders.map((order) => (
					<OrderRow
						key={order.id}
						order={order}
						warehouse={warehouse}
						isExpanded={expanded.has(order.id)}
						isPending={isPending}
						onToggle={handleToggle}
						onDetail={onDetail}
						onStart={onStart}
						onConfirm={onConfirm}
					/>
				))}
			</TableBody>
		</Table>
	);
}
