import { auditCollectionSchema } from "../src/app/modules/audit/api/audit.dto";
import { systemSchema } from "../src/app/modules/system/api/system.dto";

import { mockAudit } from "./audit-mock";
import { base, privateHeaders, problem, type MockStore } from "./mock-http";
import { shipmentFor } from "./working-shipment-mock";

export function handleMonitoring(
	request: Request,
	account: MockStore,
	sandbox?: MockStore,
) {
	const { pathname } = new URL(request.url);
	const bearer = request.headers.get("Authorization");
	const { method } = request;

	const monitoring = pathname.match(
		/^\/api\/v1\/(sandbox\/)?admin\/(shipment-audit|shipment-system)(\/export)?$/,
	);
	if (monitoring && method === "GET") {
		const [, sandboxPrefix, resource, exportPath] = monitoring;
		const store = sandboxPrefix ? sandbox : account;
		if (!bearer || !store) {
			if (sandboxPrefix && bearer === "Bearer bruno-account-token")
				return problem(403, "FORBIDDEN", "Недостаточно прав");

			return problem(
				401,
				sandboxPrefix ? "SESSION_EXPIRED" : "UNAUTHORIZED",
				"Войдите в систему",
			);
		}
		if (!sandboxPrefix && bearer !== "Bearer bruno-account-token")
			return problem(403, "FORBIDDEN", "Недостаточно прав");
		const params = new URL(request.url).searchParams;
		const audit = auditCollectionSchema.parse(
			store.get(`${base}/${sandboxPrefix ?? ""}admin/shipment-audit`),
		);
		if (resource === "shipment-audit") {
			const filename = exportPath
				? `${sandboxPrefix ? "sandbox" : "gridly"}-shipment-audit.csv`
				: undefined;

			return mockAudit(audit.items, params, filename, privateHeaders);
		}

		const system = systemSchema.parse(store.get(pathname));
		const from = params.get("from");
		const to = params.get("to");
		const start = from === null ? -Infinity : Date.parse(from);
		const end = to === null ? Infinity : Date.parse(to);
		const recent_errors = system.recent_errors.filter(({ occurred_at }) => {
			const timestamp = Date.parse(occurred_at);

			return timestamp >= start && timestamp < end;
		});
		const warehouseId = params.get("warehouse_id");
		const orderId = params.get("order_id");
		const shipment =
			warehouseId && orderId
				? shipmentFor(store, warehouseId, orderId, true)
				: undefined;
		const order_diagnostics =
			shipment && warehouseId && orderId
				? {
						warehouse_id: warehouseId,
						order_id: orderId,
						order_number: shipment.order.number,
						warehouse_name: shipment.order.warehouse_name,
						time_zone: shipment.order.time_zone,
						updated_at: shipment.order.updated_at,
						recent_events: audit.items.filter(
							(event) =>
								event.warehouse_id === warehouseId &&
								event.order_id === orderId,
						),
					}
				: null;
		return Response.json(
			{
				...system,
				error_count: recent_errors.length,
				recent_errors,
				order_diagnostics,
			},
			{ headers: privateHeaders },
		);
	}
}
