import { type ReactNode, Suspense, useState } from "react";
import type { Warehouse } from "@/domain/warehouse";
import { warehousePath } from "@/ports/navigation";
import { useWorkspaceMode } from "@/ports/session";
import { DeleteWarehouseDialog, useWarehouses } from "@/ports/warehouse";
import { errorMessage } from "@/shared/lib";
import { Feedback, RetryButton } from "@/shared/ui/feedback";
import { SearchField } from "@/shared/ui/forms";
import { Link } from "@/shared/ui/navigation";
import { Modal } from "@/shared/ui/overlays";
import styles from "../Administration.module.css";
import { adminSearch } from "../model/adminSearch";
import { DeleteRowAction, EditRowAction, SortedAdminTable } from "./AdminTable";

const location = (row: Warehouse) =>
	row.location || row.cabinet?.location || "";

export function WarehousesPanel({
	renderSettings,
}: {
	renderSettings: (warehouse: Warehouse) => ReactNode;
}) {
	const mode = useWorkspaceMode();
	const query = useWarehouses();
	const [search, setSearch] = useState("");
	const [warehouseToDelete, setWarehouseToDelete] = useState<string | null>(
		null,
	);
	const selectedForDeletion = query.data?.find(
		(warehouse) => warehouse.id === warehouseToDelete,
	);
	const [settingsWarehouseId, setSettingsWarehouseId] = useState<string | null>(
		null,
	);
	const settingsWarehouse = query.data?.find(
		({ id }) => id === settingsWarehouseId,
	);
	const matches = adminSearch(search);
	const rows = (query.data ?? []).filter((row) =>
		matches([row.name, location(row), row.timezone]),
	);

	return (
		<section className={styles.panel} aria-label="Склады">
			<SearchField
				aria-label="Поиск по складам"
				value={search}
				onChange={setSearch}
			/>
			{query.isPending && <Feedback>Загружаем склады…</Feedback>}
			{query.error && (
				<Feedback tone="error" action={<RetryButton onRetry={query.refetch} />}>
					{errorMessage(query.error)}
				</Feedback>
			)}
			{query.isSuccess && (
				<SortedAdminTable<Warehouse>
					label="Доступные склады"
					rows={rows}
					rowKey={(row) => row.id}
					columns={[
						{
							label: "Название",
							value: (row) => row.name,
							cell: (row) => (
								<Link to={warehousePath(mode, row.id)}>{row.name}</Link>
							),
						},
						{
							label: "Расположение",
							value: location,
							cell: (row) => location(row) || "Не указано",
						},
						{ label: "Часовой пояс", value: (row) => row.timezone },
						{
							label: "Действия",
							cell: (row) => (
								<div className={styles.actions}>
									<Link
										to={`?tab=orders&warehouse_id=${encodeURIComponent(row.id)}`}
									>
										Заказы
									</Link>
									<EditRowAction
										label="Настройки для склада"
										onClick={() => setSettingsWarehouseId(row.id)}
									/>
									<DeleteRowAction
										label={`Удалить склад «${row.name}»`}
										disabled={
											row.revision === undefined ||
											!row.allowedActions?.includes("delete")
										}
										onClick={() => setWarehouseToDelete(row.id)}
									/>
								</div>
							),
						},
					]}
				/>
			)}
			{settingsWarehouse && (
				<Modal
					title={`Настройки склада: ${settingsWarehouse.name}`}
					wide
					onClose={() => setSettingsWarehouseId(null)}
				>
					<Suspense
						fallback={<Feedback tone="loading">Загружаем настройки…</Feedback>}
					>
						{renderSettings(settingsWarehouse)}
					</Suspense>
				</Modal>
			)}
			{selectedForDeletion && (
				<DeleteWarehouseDialog
					warehouse={selectedForDeletion}
					onCancel={() => setWarehouseToDelete(null)}
					onDeleted={() => setWarehouseToDelete(null)}
				/>
			)}
		</section>
	);
}
