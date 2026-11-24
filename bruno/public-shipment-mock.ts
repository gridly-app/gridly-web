import type { GuestLink } from "../src/app/modules/guest-links/api/guestLink.dto";
import { guestShipmentSchema } from "../src/app/modules/shipment-portal/api/guestShipment.dto";

import {
	base,
	type MockStore,
	notFound,
	privateHeaders,
	problem,
} from "./mock-http";
import { shipmentFor } from "./working-shipment-mock";

export function publicShipmentResponse(
	request: Request,
	{
		link,
		warehouse,
		store,
	}: {
		link: GuestLink;
		warehouse: string;
		store: MockStore;
	},
) {
	const { pathname } = new URL(request.url);
	const { method } = request;

	if (link.status !== "active" || Date.parse(link.expires_at) <= Date.now())
		return problem(404, "GUEST_LINK_UNAVAILABLE", "Ссылка недоступна");
	const sections = new Set(link.sections);
	const orders = link.order_ids.flatMap((id) => {
		const shipment = shipmentFor(store, warehouse, id);
		if (!shipment) return [];
		const { order, items, plan, actual, milestones, documents } = shipment;
		return [
			guestShipmentSchema.parse({
				id,
				sections: link.sections,
				order,
				...(sections.has("warehouse") && { warehouse: shipment.warehouse }),
				...(sections.has("items") && { items }),
				...(sections.has("calendar") && {
					plan,
					actual,
					calendar_items: items.map(({ order_line_id, name, sku }) => ({
						order_line_id,
						name,
						sku,
					})),
				}),
				...(sections.has("milestones") && { milestones }),
				...(sections.has("documents") && {
					documents: documents.filter((item) => item.published),
				}),
			}),
		];
	});
	if (pathname === `${base}/public/shipments` && method === "GET")
		return Response.json({ orders }, { headers: privateHeaders });
	const download = pathname.match(/\/documents\/([^/]+)\/download$/);
	if (
		method === "GET" &&
		download &&
		orders.some((order) =>
			order.documents?.some(
				(item) => item.id === decodeURIComponent(download[1] ?? ""),
			),
		)
	) {
		return new Response("Тестовая накладная", {
			headers: {
				...privateHeaders,
				"Content-Type": "text/plain",
				"Content-Disposition": "attachment; filename=shipment.txt",
			},
		});
	}
	return notFound();
}
