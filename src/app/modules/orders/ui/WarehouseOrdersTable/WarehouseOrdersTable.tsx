import type { Order, Warehouse } from "@/domain/warehouse";
import { StatusBadge } from "@/ports/warehouse";

import { formatMoment } from "@/shared/lib";
import { adminLocation } from "@/ports/navigation";
import { orderKinds, orderStatusLabel } from "../../model/orderLabels";

import { Link } from "@/shared/ui/navigation";

import {
	type TableColumns,
	SortedTable,
	managementStyles as styles,
} from "@/shared/ui/management";

export function WarehouseOrdersTable({
	warehouse,
	rows,
}: {
	warehouse: Warehouse;
	rows: Order[];
}) {
	const columns: TableColumns<Order> = [
		{
			id: "number",
			label: "Номер",
			value: (row) => row.number,
			cell: (row) => (
				<Link
					className={styles.link}
					to={adminLocation("orders", {
						warehouse_id: warehouse.id,
						order: row.id,
					})}
				>
					{row.number}
				</Link>
			),
		},
		{ id: "kind", label: "Тип", value: (row) => orderKinds[row.kind] },
		{ id: "party", label: "Контрагент", value: (row) => row.party },
		{
			id: "status",
			label: "Статус",
			value: (row) => orderStatusLabel(row.status),
			cell: (row) => <StatusBadge value={row.status} />,
		},
		{
			id: "created",
			label: "Создан",
			value: (row) => Date.parse(row.created),
			cell: (row) => formatMoment(row.created, warehouse.timezone),
		},
		{
			id: "actions",
			label: "Действия",
			cell: (row) =>
				row.kind === "outbound" && (
					<div className={styles.actions}>
						<Link
							className={styles.link}
							to={adminLocation("system", {
								warehouse_id: warehouse.id,
								order_id: row.id,
							})}
						>
							Диагностика
						</Link>
						<Link
							className={styles.link}
							to={adminLocation("links", {
								warehouse_id: warehouse.id,
								order_id: row.id,
							})}
						>
							Гостевой доступ
						</Link>
					</div>
				),
		},
	];

	return (
		<SortedTable
			label="Заказы склада"
			rows={rows}
			rowKey={(row) => row.id}
			columns={columns}
		/>
	);
}
