import type { ReactNode } from "react";

import type { Warehouse } from "@/domain/warehouse";
import { useWarehouses } from "@/ports/warehouse";

import { errorMessage } from "@/shared/lib";
import { Feedback, RetryButton } from "@/shared/ui/feedback";
import { Combobox } from "@/shared/ui/forms";

import { managementStyles as styles } from "@/shared/ui/management";

export function WarehouseSelection({
	label,
	warehouseId,
	children,
	onWarehouseChange,
}: {
	label: string;
	warehouseId: string | null;
	children: (warehouse: Warehouse) => ReactNode;
	onWarehouseChange: (id: string) => void;
}) {
	const query = useWarehouses();
	const warehouses = query.data ?? [];
	const warehouse = warehouseId
		? warehouses.find(({ id }) => id === warehouseId)
		: warehouses[0];
	const options = warehouses.map(({ id, name }) => ({
		value: id,
		label: name,
	}));

	return (
		<section className={styles.panel} aria-label={label}>
			{query.isPending && <Feedback tone="loading">Загружаем склады…</Feedback>}
			{query.error && (
				<Feedback tone="error" action={<RetryButton onRetry={query.refetch} />}>
					{errorMessage(query.error)}
				</Feedback>
			)}
			{options.length > 0 && (
				<Combobox
					className={styles.warehouseSelect}
					aria-label="Склад"
					value={warehouse?.id ?? ""}
					onValueChange={onWarehouseChange}
					options={options}
				/>
			)}
			{query.isSuccess && !options.length && (
				<Feedback tone="empty">Доступных складов нет.</Feedback>
			)}
			{query.isSuccess && options.length > 0 && !warehouse && (
				<Feedback tone="warning">
					Выбранный склад недоступен. Выберите склад из списка.
				</Feedback>
			)}
			{warehouse && children(warehouse)}
		</section>
	);
}
