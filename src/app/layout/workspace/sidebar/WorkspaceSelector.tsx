import { IconBuildingWarehouse } from "@tabler/icons-react";
import { Select } from "@/shared/ui/forms";
import styles from "./WorkspaceSelector.module.css";

export interface WorkspaceSelectorProps {
	warehouseId: string;
	changeWarehouse: (warehouseId: string) => void;
	warehouses: readonly { id: string; name: string }[];
}

export function WorkspaceSelector({
	warehouseId,
	changeWarehouse,
	warehouses,
}: WorkspaceSelectorProps) {
	const items = [
		{ value: "new", label: "+ Создать склад" },
		...warehouses.map((warehouse) => ({
			value: warehouse.id,
			label: warehouse.name,
		})),
	];

	return (
		<div className={styles.dropdown}>
			<Select
				icon={
					<IconBuildingWarehouse className={styles.icon} aria-hidden="true" />
				}
				options={items}
				value={warehouseId}
				onValueChange={changeWarehouse}
				className={styles.trigger}
				aria-label="Рабочее пространство — выбор склада"
			/>
		</div>
	);
}
