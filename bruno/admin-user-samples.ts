import { usersSchema } from "../src/app/modules/users/api/users.dto";
import type { warehouseDto } from "../src/app/modules/warehouse-data/api/warehouses/warehouseDto";
import type { z } from "zod";

import { base, type MockStore } from "./mock-http";

const accountNames = [
	"Мария Волкова",
	"Артём Лебедев",
	"Дарья Орлова",
	"Никита Козлов",
	"Елена Соколова",
];
const permissionCatalog = [
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
	{
		code: "shipment.links.manage",
		label: "Гостевые ссылки",
		group: "Управление",
	},
	{
		code: "shipment.users.manage",
		label: "Управление участниками",
		group: "Управление",
	},
	{ code: "shipment.system.view", label: "Диагностика", group: "Мониторинг" },
];
const membershipActions = ["edit-memberships", "revoke-warehouse-access"];

type WarehouseSample = z.infer<typeof warehouseDto>;

export function seedUsers(
	store: MockStore,
	prefix: string,
	warehouses: WarehouseSample[],
	selectedWarehouse: WarehouseSample,
) {
	const usersPath = `${base}${prefix}/admin/shipment-users`;
	const users = usersSchema.parse(store.get(usersPath)).items;
	const extraUsers = accountNames.map((name, index) => ({
		id: `user-sample-${index + 1}`,
		kind: "account" as const,
		name,
		login: `warehouse${index + 1}@gridly.local`,
		revision: 1,
		warehouses: [
			{
				warehouse_id: selectedWarehouse.id,
				warehouse_name: selectedWarehouse.name,
				permissions: [
					"warehouse.view",
					permissionCatalog[index + 1]?.code ?? "warehouse.inventory.view",
				],
				is_owner: index === 0,
			},
		],
	}));
	store.set(usersPath, {
		items: [...users, ...extraUsers].map((user) =>
			user.kind === "guest"
				? user
				: {
						...user,
						allowed_actions: prefix
							? membershipActions
							: [...membershipActions, "edit-profile", "deactivate-account"],
					},
		),
		allowed_actions: ["add-warehouse-member"],
		manageable_warehouse_ids: warehouses.map(({ id }) => id),
		permission_catalog: permissionCatalog,
	});
}
