import type { AuditUser, Permission } from "../api/users.dto";

const legacyPermissions: Permission[] = [
	{ code: "warehouse.view", label: "Просмотр склада", group: "Просмотр" },
	{
		code: "warehouse.manage",
		label: "Управление складом",
		group: "Управление",
	},
	{
		code: "shipment.manage",
		label: "Управление отгрузками",
		group: "Управление",
	},
	{ code: "shipment.audit", label: "Просмотр аудита", group: "Мониторинг" },
];

export function userPermissionCatalog(
	users: AuditUser[],
	catalog?: Permission[],
) {
	if (catalog) return catalog;

	const assignedCodes = new Set<string>();

	for (const user of users) {
		if (user.kind !== "account") continue;

		for (const access of user.warehouses) {
			for (const code of access.permissions) assignedCodes.add(code);
		}
	}

	const observedPermissions = legacyPermissions.filter(({ code }) =>
		assignedCodes.has(code),
	);

	return observedPermissions.length ? observedPermissions : undefined;
}
