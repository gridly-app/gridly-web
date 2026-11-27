import { guestLinkStatuses } from "@/domain/shipment";
import { formatMoment, textSearch } from "@/shared/lib";

import type { AuditUser, Permission } from "../api/users.dto";
import { userKinds } from "../config/accessLabels";

export type UserFilters = {
	search: string;
	kind: "all" | AuditUser["kind"];
	warehouse: string;
	status: "all" | Extract<AuditUser, { kind: "guest" }>["status"];
};

export const defaultUserFilters: UserFilters = {
	search: "",
	kind: "all",
	warehouse: "all",
	status: "all",
};

export function userWarehouseOptions(users: AuditUser[]) {
	const locations = new Map<string, string>();

	for (const user of users) {
		const warehouses = user.kind === "account" ? user.warehouses : [user];

		for (const warehouse of warehouses) {
			locations.set(warehouse.warehouse_id, warehouse.warehouse_name);
		}
	}

	return [...locations].map(([value, label]) => ({ value, label }));
}

export function filterAdminUsers(
	users: AuditUser[],
	{ search, kind, warehouse, status }: UserFilters,
	permissions: Permission[],
	userId: string | null,
	userKind?: AuditUser["kind"],
) {
	const labels = new Map(permissions.map(({ code, label }) => [code, label]));
	const matches = textSearch(search);

	function permissionLabel(code: string) {
		return labels.get(code) ?? code;
	}

	function isSelectedUser(user: AuditUser) {
		if (!userId) return true;

		return user.id === userId && (!userKind || user.kind === userKind);
	}

	function matchesStatus(user: AuditUser) {
		return (
			status === "all" || (user.kind === "guest" && user.status === status)
		);
	}

	return users.filter((user) => {
		const access = user.kind === "account" ? user.warehouses : [user];
		const matchesWarehouse =
			warehouse === "all" ||
			access.some((entry) => entry.warehouse_id === warehouse);

		if (!isSelectedUser(user)) return false;
		if (kind !== "all" && kind !== user.kind) return false;
		if (!matchesStatus(user) || !matchesWarehouse) return false;
		if (!search) return true;

		return matches(userSearchFields(user, access, permissionLabel));
	});
}

function userSearchFields(
	user: AuditUser,
	access: { warehouse_name: string }[],
	permissionLabel: (code: string) => string,
) {
	const common = [
		user.name,
		userKinds[user.kind],
		...access.map((entry) => entry.warehouse_name),
	];

	if (user.kind === "account") {
		const permissionLabels = user.warehouses.flatMap((entry) =>
			entry.permissions.map(permissionLabel),
		);

		return [...common, user.login, ...permissionLabels];
	}

	return [
		...common,
		user.order_number,
		guestLinkStatuses[user.status],
		formatMoment(user.expires_at, user.time_zone),
	];
}
