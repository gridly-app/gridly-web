import type { GuestShipment } from "./guestShipment.dto";

export function guestShipmentView(access: GuestShipment) {
	const sections = new Set(access.sections);
	const warehouse = sections.has("warehouse")
		? (access.warehouse ?? {
				priority: null,
				quantities: [],
			})
		: null;
	const items = sections.has("items") ? (access.items ?? []) : null;
	const calendar = sections.has("calendar")
		? {
				plan: access.plan ?? [],
				actual: access.actual ?? [],
				items: access.calendar_items ?? items ?? [],
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
