import type { AuditEvent } from "../src/domain/shipment";
import type {
	EditableAccount,
	AuditUser,
	Permission,
} from "../src/app/modules/users/api/users.dto";
import { auditCollectionSchema } from "../src/app/modules/audit/api/audit.dto";

import { base, type MockStore } from "./mock-http";

export function recordPermissionChange(
	store: MockStore,
	items: AuditUser[],
	previousUser: Pick<EditableAccount, "warehouses">,
	currentUser: Pick<EditableAccount, "warehouses" | "name">,
	catalog?: Permission[],
) {
	const changes: AuditEvent["changes"] = [];
	const warehouseIds = new Set(
		[...previousUser.warehouses, ...currentUser.warehouses].map(
			(entry) => entry.warehouse_id,
		),
	);
	const permissionLabel = (code: string) =>
		catalog?.find((permission) => permission.code === code)?.label ?? code;
	for (const id of warehouseIds) {
		const previous = previousUser.warehouses.find(
			(entry) => entry.warehouse_id === id,
		);
		const next = currentUser.warehouses.find(
			(entry) => entry.warehouse_id === id,
		);
		const before = new Set(previous?.permissions);
		const after = new Set(next?.permissions);
		if (
			before.size === after.size &&
			[...before].every((code) => after.has(code))
		)
			continue;
		changes.push({
			field: "permissions",
			label: `Права доступа · ${next?.warehouse_name ?? previous?.warehouse_name ?? id}`,
			before: [...before].map(permissionLabel),
			after: [...after].map(permissionLabel),
		});
	}
	if (changes.length) {
		const auditPath = `${base}/admin/shipment-audit`;
		const audit = auditCollectionSchema.safeParse(store.get(auditPath));
		if (audit.success) {
			const id = crypto.randomUUID();
			const actor = items.find((item) => item.id === "user-sandbox-admin");
			const entry: AuditEvent = {
				id,
				occurred_at: new Date().toISOString(),
				event_type: "account.permissions.updated",
				event_label: `Обновлены права · ${currentUser.name}`,
				result: "success",
				actor_id: actor?.id ?? null,
				actor_name: actor?.name ?? null,
				source: "account",
				warehouse_id: null,
				order_id: null,
				changes,
				correlation_id: id,
			};
			store.set(auditPath, {
				items: [entry, ...audit.data.items],
				total: audit.data.total + 1,
			});
		}
	}
}
