import { z } from "zod";

const text = z.string();
const optionalText = text.nullable();
const instant = z.iso.datetime({ offset: true });
const quantity = z.number().nonnegative();

export const priorities = {
	low: "Низкий",
	normal: "Обычный",
	high: "Высокий",
} as const;
export const categories = {
	specification: "Заявка / спецификация",
	drawing: "Чертёж",
	quality_certificate: "Паспорт качества",
	transport: "Транспортный документ",
	closing: "Закрывающий документ",
} as const;
export const stages = {
	accepted: "Заказ принят",
	warehouse_preparation: "Подготовка на складе",
	ready_to_ship: "Готов к отгрузке",
	loading: "Погрузка",
	handed_to_carrier: "Передан перевозчику",
	in_transit: "В пути",
	delivered: "Доставлен или получен",
} as const;
export const transports = {
	rail: "Железнодорожный",
	road: "Автомобильный",
} as const;
export const documentSchema = z.object({
	id: text,
	name: text,
	category: z.enum(Object.keys(categories) as (keyof typeof categories)[]),
	uploaded_at: instant,
	version: z.number().int().positive(),
});
export const planSchema = z.object({
	date: z.iso.date(),
	order_line_id: text,
	quantity: quantity.positive(),
	unit: text,
});
export const actualSchema = z.object({
	id: text,
	order_line_id: text,
	quantity: quantity.positive(),
	unit: text,
	packaging: optionalText,
	shipped_at: instant,
	loaded_at: instant.nullable(),
	transport_type: z.enum(
		Object.keys(transports) as (keyof typeof transports)[],
	),
	vehicle_number: optionalText,
	reference_number: optionalText,
	comment: optionalText,
});
export const milestoneSchema = z.object({
	code: z.enum(Object.keys(stages) as (keyof typeof stages)[]),
	state: z.enum(["completed", "current", "pending"]),
	occurred_at: instant.nullable(),
	planned_at: instant.nullable(),
	note: optionalText,
});
export const shipmentSchema = z.object({
	order: z.object({
		number: text,
		recipient: text,
		warehouse_name: text,
		time_zone: text.refine((zone) => {
			try {
				new Intl.DateTimeFormat("ru-RU", { timeZone: zone });
				return true;
			} catch {
				return false;
			}
		}),
		created_at: instant,
		state: z.enum(["active", "on_hold", "cancelled", "delivered"]),
		status_reason: optionalText,
		updated_at: instant,
	}),
	warehouse: z.object({
		priority: z
			.enum(Object.keys(priorities) as (keyof typeof priorities)[])
			.nullable(),
		quantities: z.array(
			z.object({
				unit: text,
				ready_quantity: quantity,
				processing_quantity: quantity,
				remaining_quantity: quantity,
			}),
		),
	}),
	items: z.array(
		z.object({
			order_line_id: text,
			sku: text,
			name: text,
			grade: optionalText,
			quantity,
			unit: text,
			packaging: optionalText,
			variant: optionalText,
		}),
	),
	plan: z.array(planSchema),
	actual: z.array(actualSchema),
	milestones: z.array(milestoneSchema),
	documents: z.array(documentSchema),
});
export const issuedLinkSchema = z.object({
	url: z.url({ protocol: /^https?$/ }),
	expires_at: instant,
});

export type Shipment = z.infer<typeof shipmentSchema>;
export type Plan = z.infer<typeof planSchema>;
export type Actual = z.infer<typeof actualSchema>;
export type Milestone = z.infer<typeof milestoneSchema>;

export function formatMoment(value: string | number | null, timeZone?: string) {
	if (value === null) return "Не указано";
	return new Date(value).toLocaleString("ru-RU", {
		dateStyle: "short",
		timeStyle: "short",
		timeZone,
	});
}
export function formatUnit(unit: string) {
	return (
		({ pcs: "шт.", pack: "упак.", pallet: "пал." } as Record<string, string>)[
			unit
		] ?? unit
	);
}

export const guestSections = {
	warehouse: "Готовность на складе",
	milestones: "Этапы заказа",
	calendar: "План и факт отгрузок",
	items: "Номенклатура",
	documents: "Документы",
};

export const guestSectionSchema = z.enum([
	"warehouse",
	"milestones",
	"calendar",
	"items",
	"documents",
] satisfies (keyof typeof guestSections)[]);
export type GuestSection = z.infer<typeof guestSectionSchema>;
