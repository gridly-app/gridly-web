import { z } from "zod";

const text = z.string();
const date = z.iso.datetime({ offset: true });

export const userNameMaxLength = 120;
export const userLoginMaxLength = 254;

const warehouseAccess = z.object({
	warehouse_id: text.min(1),
	warehouse_name: text,
	permissions: z
		.array(text.min(1))
		.refine((codes) => new Set(codes).size === codes.length),
});

const subject = z.object({ id: text.min(1), name: text });
export const accountUserSchema = subject.extend({
	kind: z.literal("account"),
	login: text,
	warehouses: z
		.array(warehouseAccess)
		.refine(
			(items) =>
				new Set(items.map(({ warehouse_id }) => warehouse_id)).size ===
				items.length,
		),
	revision: z.number().int().nonnegative().optional(),
});
export const accountUserUpdateSchema = accountUserSchema
	.pick({ warehouses: true })
	.extend({
		name: text.trim().min(1).max(userNameMaxLength),
		login: text.trim().min(1).max(userLoginMaxLength),
		revision: z.number().int().nonnegative(),
	});
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
	permission_catalog: z
		.array(permissionSchema)
		.refine((catalog) => {
			const codes = new Set(catalog.map(({ code }) => code));

			return codes.size === catalog.length;
		}, "Коды разрешений должны быть уникальны.")
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
		.refine(
			(items) =>
				new Set(items.map(({ id, kind }) => JSON.stringify([kind, id])))
					.size === items.length,
		),
});
export type AuditUser = z.infer<typeof usersSchema>["items"][number];

export function isEditableAccount(user: AuditUser): user is EditableAccount {
	return user.kind === "account" && user.revision !== undefined;
}
