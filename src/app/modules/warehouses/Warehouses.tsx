import { type ReactNode, Suspense, useState } from "react";

import type { Warehouse } from "@/domain/warehouse";
import { DeleteWarehouseDialog, useWarehouses } from "@/ports/warehouse";

import { textSearch, errorMessage } from "@/shared/lib";
import { warehouseLocation } from "./model/warehouseLocation";

import { Feedback, RetryButton } from "@/shared/ui/feedback";
import { SearchField } from "@/shared/ui/forms";
import { Modal } from "@/shared/ui/overlays";

import { WarehousesTable } from "./ui/WarehousesTable/WarehousesTable";

import { managementStyles as styles } from "@/shared/ui/management";

export function Warehouses({
	renderSettings,
}: {
	renderSettings: (warehouse: Warehouse) => ReactNode;
}) {
	const query = useWarehouses();
	const [search, setSearch] = useState("");
	const [action, setAction] = useState<{
		type: "settings" | "delete";
		id: string;
	} | null>(null);
	const selected = query.data?.find(({ id }) => id === action?.id);
	const settingsWarehouse = action?.type === "settings" ? selected : undefined;
	const selectedForDeletion = action?.type === "delete" ? selected : undefined;
	const matches = textSearch(search);
	const rows = (query.data ?? []).filter((row) =>
		matches([row.name, warehouseLocation(row), row.timezone]),
	);

	function handleSettings(id: string) {
		setAction({ type: "settings", id });
	}

	function handleDelete(id: string) {
		setAction({ type: "delete", id });
	}

	function handleClose() {
		setAction(null);
	}

	return (
		<section className={styles.panel} aria-label="Склады">
			<SearchField
				aria-label="Поиск по складам"
				value={search}
				onChange={setSearch}
			/>
			{query.isPending && <Feedback tone="loading">Загружаем склады…</Feedback>}
			{query.error && (
				<Feedback tone="error" action={<RetryButton onRetry={query.refetch} />}>
					{errorMessage(query.error)}
				</Feedback>
			)}
			{query.isSuccess && (
				<WarehousesTable
					rows={rows}
					onSettings={handleSettings}
					onDelete={handleDelete}
				/>
			)}
			{settingsWarehouse && (
				<Modal
					title={`Настройки склада: ${settingsWarehouse.name}`}
					wide
					onClose={handleClose}
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
					onCancel={handleClose}
					onDeleted={handleClose}
				/>
			)}
		</section>
	);
}
