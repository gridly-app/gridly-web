import type { GuestShipment } from "../../api/guestShipment.dto";

export function guestShipmentView(access: GuestShipment) {
	const sections = new Set(access.sections);
	const warehouse = sections.has("warehouse")
		? (access.warehouse ?? {
				priority: null,
				quantities: [],
			})
		: null;
	const items = sections.has("items") ? (access.items ?? []) : null;
	const detailsById = new Map(items?.map((item) => [item.order_line_id, item]));
	const calendar = sections.has("calendar")
		? {
				plan: access.plan ?? [],
				actual: access.actual ?? [],
				items: (access.calendar_items ?? items ?? []).map((item) => ({
					order_line_id: item.order_line_id,
					name: item.name,
					sku: item.sku,
					grade: detailsById.get(item.order_line_id)?.grade ?? null,
				})),
			}
		: null;

	return {
		order: access.order,
		warehouse,
		calendar,
		items,
		milestones: sections.has("milestones") ? (access.milestones ?? []) : null,
		documents: sections.has("documents") ? (access.documents ?? []) : null,
	};
}
