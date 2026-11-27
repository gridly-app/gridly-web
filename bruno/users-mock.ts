import {
	accountUserUpdateSchema,
	assignmentSchema,
	ownerTransferSchema,
	usersSchema,
} from "../src/app/modules/users/api/users.dto";
import { warehouseDto } from "../src/app/modules/warehouse-data/api/warehouses/warehouseDto";

import {
	base,
	type MockStore,
	notFound,
	privateHeaders,
	problem,
} from "./mock-http";
import { recordPermissionChange } from "./user-permission-audit-mock";

export function handleUsers(
	request: Request,
	store: MockStore,
	sandboxPrefix: string | undefined,
	userId: string | undefined,
	membershipWarehouse: string | undefined,
	body: unknown,
) {
	const { method } = request;
	const path = `${base}/${sandboxPrefix ?? ""}admin/shipment-users`;
	const result = usersSchema.safeParse(store.get(path));
	if (!result.success) return;
	const items = result.data.items;
	if (!userId && method === "GET")
		return Response.json(result.data, { headers: privateHeaders });
	if (userId === "assignments" && method === "POST") {
		if (!result.data.allowed_actions.includes("add-warehouse-member"))
			return problem(403, "FORBIDDEN", "Недостаточно прав");

		const assignment = assignmentSchema.safeParse(body);

		if (!assignment.success)
			return problem(422, "INVALID_PERMISSION_SET", "Проверьте назначение");

		const { login, warehouse_id, permissions } = assignment.data;
		const user = items.find(
			(item) =>
				item.kind === "account" &&
				item.login.toLowerCase() === login.toLowerCase(),
		);
		const warehouse = warehouseDto.safeParse(
			store.get(`${base}/warehouses/${warehouse_id}`),
		);

		if (!user || user.kind !== "account")
			return problem(404, "USER_NOT_FOUND", "Аккаунт не найден");
		if (
			!warehouse.success ||
			(result.data.manageable_warehouse_ids &&
				!result.data.manageable_warehouse_ids.includes(warehouse_id))
		)
			return problem(403, "FORBIDDEN", "Недостаточно прав");
		if (
			!permissions.every((code) =>
				result.data.permission_catalog?.some((item) => item.code === code),
			)
		)
			return problem(422, "INVALID_PERMISSION_SET", "Проверьте разрешения");
		if (
			user.warehouses.some(
				(membership) => membership.warehouse_id === warehouse_id,
			)
		)
			return problem(409, "ALREADY_MEMBER", "Аккаунт уже участвует в складе");

		const membership = {
			warehouse_id,
			warehouse_name: warehouse.data.name,
			permissions,
		};
		const changed = {
			...user,
			warehouses: [...user.warehouses, membership],
			revision: (user.revision ?? 0) + 1,
		};

		store.set(path, {
			...result.data,
			items: items.map((item) => (item === user ? changed : item)),
		});

		return Response.json(changed, { status: 201, headers: privateHeaders });
	}

	const user = items.find(
		(item) => item.id === decodeURIComponent(userId ?? ""),
	);
	if (user?.kind !== "account") return notFound();
	if (method === "DELETE") {
		const action = membershipWarehouse
			? "revoke-warehouse-access"
			: "deactivate-account";

		if (!user.allowed_actions.includes(action))
			return problem(403, "FORBIDDEN", "Недостаточно прав");
		if (!sandboxPrefix && user.id === "user-sandbox-admin")
			return problem(403, "SELF_DELETE", "Нельзя удалить свой аккаунт");

		const removedWarehouse =
			membershipWarehouse && decodeURIComponent(membershipWarehouse);
		const isRemovingOwner = user.warehouses.some(
			({ warehouse_id, is_owner }) =>
				is_owner && (!removedWarehouse || warehouse_id === removedWarehouse),
		);

		if (isRemovingOwner)
			return problem(
				409,
				"WAREHOUSE_OWNER_TRANSFER_REQUIRED",
				"Сначала передайте владение складом",
			);
		if (
			user.revision === undefined ||
			request.headers.get("If-Match") !== `"${user.revision}"`
		) {
			return problem(
				412,
				"STALE_REVISION",
				"Обновите список пользователей и попробуйте снова",
			);
		}
		store.set(path, {
			...result.data,
			items: membershipWarehouse
				? items.map((item) =>
						item === user
							? {
									...user,
									warehouses: user.warehouses.filter(
										({ warehouse_id }) =>
											warehouse_id !== decodeURIComponent(membershipWarehouse),
									),
									revision: (user.revision ?? 0) + 1,
								}
							: item,
					)
				: items.filter((item) => item.id !== user.id),
		});
		return new Response(null, { status: 204, headers: privateHeaders });
	}
	if (method !== "PATCH")
		return problem(405, "METHOD_NOT_ALLOWED", "Операция недоступна");
	const update = accountUserUpdateSchema.safeParse(body);
	if (!update.success)
		return problem(
			422,
			"INVALID_PERMISSION_SET",
			"Проверьте поля пользователя",
		);
	if (
		(update.data.login !== undefined &&
			!user.allowed_actions.includes("edit-profile")) ||
		(update.data.warehouses !== undefined &&
			!user.allowed_actions.includes("edit-memberships"))
	) {
		return problem(403, "FORBIDDEN", "Недостаточно прав");
	}
	if (update.data.revision !== user.revision)
		return problem(
			409,
			"STALE_REVISION",
			"Откройте карточку пользователя заново",
		);
	if (
		items.some(
			(item) =>
				item.kind === "account" &&
				item.id !== user.id &&
				item.login.toLowerCase() === update.data.login?.toLowerCase(),
		)
	) {
		return problem(409, "LOGIN_TAKEN", "Этот логин уже используется");
	}
	const catalog = result.data.permission_catalog;
	const assignments = update.data.warehouses?.map((entry) => {
		const previous = user.warehouses.find(
			(assignment) => assignment.warehouse_id === entry.warehouse_id,
		);
		const warehouse = warehouseDto.safeParse(
			store.get(`${base}/warehouses/${entry.warehouse_id}`),
		);
		if (!warehouse.success) return undefined;
		if (
			catalog &&
			entry.permissions.some(
				(code) =>
					!catalog.some((permission) => permission.code === code) &&
					!previous?.permissions.includes(code),
			)
		)
			return undefined;
		return { ...entry, warehouse_name: warehouse.data.name };
	});
	if (assignments?.some((entry) => !entry)) {
		return problem(
			422,
			"INVALID_PERMISSION_SET",
			"Проверьте склады и разрешения",
		);
	}
	const changed = {
		...user,
		name: update.data.name ?? user.name,
		login: update.data.login ?? user.login,
		revision: update.data.revision + 1,
		warehouses:
			assignments?.filter((entry) => entry !== undefined) ?? user.warehouses,
	};
	store.set(path, {
		...result.data,
		items: items.map((item) => (item.id === changed.id ? changed : item)),
	});
	if (!sandboxPrefix)
		recordPermissionChange(store, items, user, changed, catalog);

	return Response.json(changed, { headers: privateHeaders });
}

export function handleOwnerTransfer(
	request: Request,
	store: MockStore,
	sandboxPrefix: string | undefined,
	warehouseId: string,
	body: unknown,
) {
	if (request.method !== "POST")
		return problem(405, "METHOD_NOT_ALLOWED", "Операция недоступна");

	const path = `${base}/${sandboxPrefix ?? ""}admin/shipment-users`;
	const result = usersSchema.safeParse(store.get(path));

	if (!result.success) return;

	const manageable = result.data.manageable_warehouse_ids;

	if (manageable && !manageable.includes(warehouseId))
		return problem(403, "FORBIDDEN", "Недостаточно прав");

	const transfer = ownerTransferSchema.safeParse(body);

	if (!transfer.success)
		return problem(422, "INVALID_OWNER", "Укажите нового владельца склада");

	const newOwner = result.data.items.find(
		(item) =>
			item.kind === "account" &&
			item.id === transfer.data.user_id &&
			item.warehouses.some(({ warehouse_id }) => warehouse_id === warehouseId),
	);

	if (!newOwner)
		return problem(
			422,
			"INVALID_OWNER",
			"Новый владелец должен быть участником склада",
		);

	const items = result.data.items.map((item) => {
		if (item.kind !== "account") return item;

		const membership = item.warehouses.find(
			({ warehouse_id }) => warehouse_id === warehouseId,
		);
		const isOwner = item.id === newOwner.id;

		if (!membership || Boolean(membership.is_owner) === isOwner) return item;

		const warehouses = item.warehouses.map((entry) =>
			entry === membership ? { ...entry, is_owner: isOwner } : entry,
		);

		return { ...item, warehouses, revision: (item.revision ?? 0) + 1 };
	});

	store.set(path, { ...result.data, items });

	return new Response(null, { status: 204, headers: privateHeaders });
}
