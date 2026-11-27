import { IconBuildingWarehouse } from "@tabler/icons-react";

import { newWarehouseId } from "@/ports/navigation";
import { Skeleton } from "@/shared/ui/feedback";
import { Select } from "@/shared/ui/forms";

import styles from "./WorkspaceSelector.module.css";

export function WorkspaceSelector({
	warehouseId,
	warehouses,
	isLoading,
	onWarehouseChange,
}: {
	warehouseId: string;
	warehouses: readonly { id: string; name: string }[];
	isLoading: boolean;
	onWarehouseChange: (warehouseId: string) => void;
}) {
	if (isLoading)
		return <Skeleton className={styles.loading} label="Загружаем склады…" />;

	const options = [
		{ value: newWarehouseId, label: "+ Создать склад" },
		...warehouses.map((warehouse) => ({
			value: warehouse.id,
			label: warehouse.name,
		})),
	];
	const icon = (
		<IconBuildingWarehouse className={styles.icon} aria-hidden="true" />
	);

	return (
		<div className={styles.dropdown}>
			<Select
				icon={icon}
				options={options}
				value={warehouseId}
				onValueChange={onWarehouseChange}
				className={styles.trigger}
				aria-label="Рабочее пространство — выбор склада"
			/>
		</div>
	);
}
