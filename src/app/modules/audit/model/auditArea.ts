import type { AuditEvent } from "@/domain/shipment";

export const auditAreaLabels = {
	inbound: "Поставки",
	outbound: "Отгрузки",
	map: "Карта склада",
	orders: "Заказы",
	access: "Доступ",
	system: "Система",
	unknown: "Раздел не указан",
};

const actionAreas = [
	["shipment.", "outbound"],
	["outbound.", "outbound"],
	["inbound.", "inbound"],
	["warehouse.map.", "map"],
	["map.", "map"],
	["order.", "orders"],
	["access.", "access"],
	["account.", "access"],
] as const;

export function auditArea(event: AuditEvent): keyof typeof auditAreaLabels {
	if (event.area) return event.area;

	const match = actionAreas.find(([prefix]) =>
		event.event_type.startsWith(prefix),
	);

	if (match) return match[1];

	return event.source === "system" ? "system" : "unknown";
}
