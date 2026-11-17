import { useId, useMemo, useState } from "react";

import type { Warehouse } from "@/domain/warehouse";

import type { EditableAccount, Permission } from "../../api/users.dto";

import { Button, Checkbox } from "@/shared/ui/controls";
import { Badge } from "@/shared/ui/dataDisplay";
import { Combobox } from "@/shared/ui/forms";

import { managementStyles as styles } from "@/shared/ui/management";

export function WarehousePermissions({
	warehouses,
	assigned,
	permissions,
	disabled,
	onChange,
}: {
	warehouses: Warehouse[];
	assigned: ReadonlyMap<string, EditableAccount["warehouses"][number]>;
	permissions: Permission[];
	disabled: boolean;
	onChange: (id: string, name: string, codes: string[]) => void;
}) {
	const fieldId = useId();
	const [warehouseId, setWarehouseId] = useState("");
	const { groups, catalogCodes } = useMemo(
		() => groupPermissions(permissions),
		[permissions],
	);
	const options = useMemo(
		() =>
			warehouses.map(({ id, name }) => ({
				value: id,
				label: `${name} · ${assigned.get(id)?.permissions.length ?? 0}`,
			})),
		[warehouses, assigned],
	);
	const warehouse =
		warehouses.find(({ id }) => id === warehouseId) ??
		warehouses.find(({ id }) => assigned.has(id)) ??
		warehouses[0];

	if (!warehouse) return null;

	const { id: activeWarehouseId, name: warehouseName } = warehouse;
	const access = assigned.get(activeWarehouseId);
	const codes = access?.permissions ?? [];
	const count = codes.length;
	const hasExtraPermissions = codes.some((code) => !catalogCodes.has(code));
	const selectedCodes = new Set(codes);

	function handlePermissionCheck(code: string, checked: boolean) {
		const updated = checked
			? [...selectedCodes, code]
			: codes.filter((value) => value !== code);

		onChange(activeWarehouseId, warehouseName, [...new Set(updated)]);
	}

	function handleRemoveAccess() {
		onChange(activeWarehouseId, warehouseName, []);
	}

	return (
		<>
			<Combobox
				className={styles.warehouseSelect}
				aria-label="Склад для настройки доступа"
				value={warehouse.id}
				onValueChange={setWarehouseId}
				options={options}
				disabled={disabled}
			/>
			<fieldset className={styles.fieldset}>
				<legend className={styles.legend}>{warehouse.name}</legend>
				<div className={styles.actions}>
					<Badge tone={count ? "success" : "neutral"}>
						{count ? `Разрешений: ${count}` : "Нет разрешений"}
					</Badge>
					{access && (
						<Button
							variant="text"
							size="sm"
							disabled={disabled}
							onClick={handleRemoveAccess}
						>
							Снять доступ
						</Button>
					)}
				</div>
				<div className={styles.editorColumns}>
					{[...groups].map(([group, permissions]) => (
						<div key={group}>
							<strong className={styles.subtle}>{group}</strong>
							{permissions.map(({ code, label }) => {
								const id = `${fieldId}-${code}`;
								const handleCheck = (checked: boolean) =>
									handlePermissionCheck(code, checked);

								return (
									<label key={code} className={styles.checkRow} htmlFor={id}>
										<Checkbox
											id={id}
											checked={selectedCodes.has(code)}
											disabled={disabled}
											onCheckedChange={handleCheck}
										/>
										{label}
									</label>
								);
							})}
						</div>
					))}
				</div>
				{hasExtraPermissions && (
					<p className={styles.subtle}>
						У склада есть дополнительные разрешения, выданные сервером. Действие
						«Снять доступ» удалит и их.
					</p>
				)}
			</fieldset>
		</>
	);
}

function groupPermissions(permissions: Permission[]) {
	const groups = new Map<string, Permission[]>();

	for (const permission of permissions) {
		const group = groups.get(permission.group) ?? [];
		group.push(permission);
		groups.set(permission.group, group);
	}

	const catalogCodes = new Set(permissions.map(({ code }) => code));

	return { groups, catalogCodes };
}
