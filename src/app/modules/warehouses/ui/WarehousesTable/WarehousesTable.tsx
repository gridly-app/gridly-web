import type { Warehouse } from "@/domain/warehouse";
import { warehousePath, adminLocation } from "@/ports/navigation";
import { useWorkspaceMode } from "@/ports/session";

import { warehouseLocation } from "../../model/warehouseLocation";

import { Link } from "@/shared/ui/navigation";

import {
	DeleteRowAction,
	EditRowAction,
	type TableColumns,
	SortedTable,
	managementStyles as styles,
} from "@/shared/ui/management";

export function WarehousesTable({
	rows,
	onSettings,
	onDelete,
}: {
	rows: Warehouse[];
	onSettings: (id: string) => void;
	onDelete: (id: string) => void;
}) {
	const mode = useWorkspaceMode();
	const columns: TableColumns<Warehouse> = [
		{
			id: "name",
			label: "Название",
			value: (row) => row.name,
			cell: (row) => (
				<Link className={styles.link} to={warehousePath(mode, row.id)}>
					{row.name}
				</Link>
			),
		},
		{
			id: "location",
			label: "Расположение",
			value: warehouseLocation,
			cell: (row) => warehouseLocation(row) || "Не указано",
		},
		{ id: "timezone", label: "Часовой пояс", value: (row) => row.timezone },
		{
			id: "actions",
			label: "Действия",
			cell: (row) => (
				<WarehouseActions
					warehouse={row}
					onSettings={onSettings}
					onDelete={onDelete}
				/>
			),
		},
	];

	return (
		<SortedTable
			label="Доступные склады"
			rows={rows}
			rowKey={(row) => row.id}
			columns={columns}
		/>
	);
}

function WarehouseActions({
	warehouse,
	onSettings,
	onDelete,
}: {
	warehouse: Warehouse;
	onSettings: (id: string) => void;
	onDelete: (id: string) => void;
}) {
	const { id, name, revision, allowedActions } = warehouse;
	const canDelete =
		revision !== undefined && allowedActions?.includes("delete");
	const ordersPath = adminLocation("orders", { warehouse_id: id });

	function handleSettings() {
		onSettings(id);
	}

	function handleDelete() {
		onDelete(id);
	}

	return (
		<div className={styles.actions}>
			<Link className={styles.link} to={ordersPath}>
				Заказы
			</Link>
			<EditRowAction label="Настройки для склада" onClick={handleSettings} />
			<DeleteRowAction
				label={`Удалить склад «${name}»`}
				disabled={!canDelete}
				onClick={handleDelete}
			/>
		</div>
	);
}
