import { guestLinkStatuses } from "@/domain/shipment";
import { userKinds } from "../config/accessLabels";
import { formatMoment, textSearch } from "@/shared/lib";
import type { AuditUser, Permission } from "../api/users.dto";

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
	const permissionLabel = (code: string) => labels.get(code) ?? code;
	const matches = textSearch(search);

	return users.filter((user) => {
		if (userId && (user.id !== userId || (userKind && user.kind !== userKind)))
			return false;
		if (kind !== "all" && kind !== user.kind) return false;
		if (status !== "all" && (user.kind !== "guest" || user.status !== status))
			return false;
		const access = user.kind === "account" ? user.warehouses : [user];
		if (
			warehouse !== "all" &&
			!access.some((entry) => entry.warehouse_id === warehouse)
		)
			return false;
		if (!search) return true;

		return matches(userSearchFields(user, access, permissionLabel));
	});
}

function userSearchFields(
	user: AuditUser,
	access: { warehouse_name: string }[],
	permissionLabel: (code: string) => string,
) {
	return [
		user.name,
		userKinds[user.kind],
		...access.map((entry) => entry.warehouse_name),
		...(user.kind === "account"
			? [
					user.login,
					...user.warehouses.flatMap((entry) =>
						entry.permissions.map(permissionLabel),
					),
				]
			: [
					user.order_number,
					guestLinkStatuses[user.status],
					formatMoment(user.expires_at, user.time_zone),
				]),
	];
}
