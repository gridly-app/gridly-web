import { z } from "zod";

import { loginMaxLength, loginSchema, newLoginSchema } from "@/domain/account";
import { environment } from "@/shared/config";

const text = z.string();
const date = z.iso.datetime({ offset: true });

export const userNameMaxLength = 120;
export const userLoginMaxLength = loginMaxLength;

export const warehouseView = "warehouse.view";

export function validWarehousePermissions(codes: string[]) {
	return codes.length === 0 || codes.includes(warehouseView);
}

function isUnique(values: string[]) {
	return new Set(values).size === values.length;
}

function hasUniqueWarehouses(items: { warehouse_id: string }[]) {
	return isUnique(items.map(({ warehouse_id }) => warehouse_id));
}

const warehouseAccess = z.object({
	warehouse_id: text.min(1),
	warehouse_name: text,
	permissions: z.array(text.min(1)).refine(isUnique),
	is_owner: z.boolean().optional(),
});

const subject = z.object({ id: text.min(1), name: text });

export const accountUserSchema = subject.extend({
	kind: z.literal("account"),
	login: text,
	warehouses: z.array(warehouseAccess).refine(hasUniqueWarehouses),
	revision: z.number().int().nonnegative().optional(),
	allowed_actions: z.array(text).default([]),
});

export const userProfileSchema = z.object({
	name: text.trim().min(1).max(userNameMaxLength),
	login: environment.extendedLogin ? newLoginSchema : loginSchema,
});

const permissionsUpdate = z
	.array(text.min(1))
	.min(1)
	.refine(isUnique)
	.refine(
		validWarehousePermissions,
		"Для дополнительных разрешений нужен доступ к просмотру склада.",
	);

const membershipUpdate = z.object({
	warehouse_id: text.min(1),
	permissions: permissionsUpdate,
});

export const assignmentSchema = membershipUpdate.extend({ login: loginSchema });

export const ownerTransferSchema = z.object({ user_id: text.min(1) });

export const accountUserUpdateSchema = userProfileSchema
	.partial()
	.extend({
		warehouses: z
			.array(membershipUpdate)
			.refine(hasUniqueWarehouses)
			.optional(),
		revision: z.number().int().nonnegative(),
	})
	.refine(
		({ name, login, warehouses }) =>
			(name !== undefined) === (login !== undefined) &&
			(name !== undefined || warehouses !== undefined),
	);

export type AccountUserUpdate = z.input<typeof accountUserUpdateSchema>;

type AccountUser = z.infer<typeof accountUserSchema>;

const permissionSchema = z.object({
	code: text.min(1),
	label: text,
	group: text,
});

export type Permission = z.infer<typeof permissionSchema>;

export type EditableAccount = AccountUser & { revision: number };

export const usersSchema = z.object({
	allowed_actions: z.array(text).default([]),
	manageable_warehouse_ids: z.array(text.min(1)).optional(),
	permission_catalog: z
		.array(permissionSchema)
		.refine(
			(catalog) => isUnique(catalog.map(({ code }) => code)),
			"Коды разрешений должны быть уникальны.",
		)
		.optional(),
	items: z
		.array(
			z.discriminatedUnion("kind", [
				accountUserSchema,
				subject.extend({
					kind: z.literal("guest"),
					warehouse_id: text.min(1),
					warehouse_name: text,
					order_id: text,
					order_number: text,
					status: z.enum(["active", "expired", "revoked"]),
					expires_at: date,
					time_zone: text.optional(),
				}),
			]),
		)
		.refine((items) => isUnique(items.map(userRowKey))),
});

export type AuditUser = z.infer<typeof usersSchema>["items"][number];

export function userRowKey(user: {
	id: string;
	kind: "account" | "guest";
	warehouse_id?: string;
	order_id?: string;
}) {
	if (user.kind === "account") return JSON.stringify([user.kind, user.id]);

	return JSON.stringify([user.kind, user.id, user.warehouse_id, user.order_id]);
}

export function isEditableAccount(user: AuditUser): user is EditableAccount {
	return user.kind === "account" && user.revision !== undefined;
}
