import { useState } from "react";

import type { EditableAccount } from "../api/users.dto";

export function useWarehouseAccessDraft(
	warehouses: EditableAccount["warehouses"],
) {
	const [initialAccess] = useState(
		() => new Map(warehouses.map((entry) => [entry.warehouse_id, entry])),
	);
	const [assigned, setAssigned] = useState(initialAccess);

	function handleAccessChange(id: string, name: string, codes: string[]) {
		setAssigned((current) => updateWarehouseAccess(current, id, name, codes));
	}

	return {
		initialAccess,
		assigned,
		hasAccessChanges: !samePermissions(initialAccess, assigned),
		handleAccessChange,
	};
}

function samePermissions(
	initial: ReadonlyMap<string, EditableAccount["warehouses"][number]>,
	assigned: ReadonlyMap<string, EditableAccount["warehouses"][number]>,
) {
	if (initial.size !== assigned.size) return false;

	for (const [id, { permissions }] of initial) {
		const current = assigned.get(id)?.permissions;

		if (current?.length !== permissions.length) return false;
		if (permissions.some((code) => !current.includes(code))) return false;
	}

	return true;
}

function updateWarehouseAccess(
	current: ReadonlyMap<string, EditableAccount["warehouses"][number]>,
	id: string,
	name: string,
	codes: string[],
) {
	const next = new Map(current);

	if (!codes.length) {
		next.delete(id);

		return next;
	}

	next.set(id, { warehouse_id: id, warehouse_name: name, permissions: codes });

	return next;
}
