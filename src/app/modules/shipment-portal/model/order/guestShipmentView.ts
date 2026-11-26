import type { GuestShipment } from "../../api/guestShipment.dto";

type GuestSection = GuestShipment["sections"][number];

export function guestShipmentView(access: GuestShipment) {
	const sections = new Set(access.sections);

	function permitted<T>(
		section: GuestSection,
		value: T | undefined,
		fallback: T,
	) {
		return sections.has(section) ? (value ?? fallback) : null;
	}

	const warehouse = permitted("warehouse", access.warehouse, {
		priority: null,
		quantities: [],
	});
	const items = permitted("items", access.items, []);
	const detailsById = new Map(items?.map((item) => [item.order_line_id, item]));
	const calendarItems = (access.calendar_items ?? items ?? []).map((item) => ({
		order_line_id: item.order_line_id,
		name: item.name,
		sku: item.sku,
		grade: detailsById.get(item.order_line_id)?.grade ?? null,
	}));
	const calendar = sections.has("calendar")
		? {
				plan: access.plan ?? [],
				actual: access.actual ?? [],
				items: calendarItems,
			}
		: null;

	return {
		order: access.order,
		warehouse,
		calendar,
		items,
		milestones: permitted("milestones", access.milestones, []),
		documents: permitted("documents", access.documents, []),
	};
}
