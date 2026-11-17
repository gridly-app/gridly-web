import { expect, test } from "bun:test";
import { matchRoutes } from "react-router-dom";
import type { WarehouseRouteHandle } from "@/ports/navigation";
import { warehouseAccess } from "@/ports/navigation";
import { warehouseChildren } from "../..";

test("the management route is available in the account workspace while shared sections also match in sandbox", () => {
	const options = {
		renderSettings: () => null,
		settingsRoute: {
			id: "settings",
			path: "settings",
			access: warehouseAccess,
			resources: [],
		} as const,
		progress: () => null,
		useHttp: () => ({ request: () => Promise.resolve(undefined) }),
	};
	const shipmentPath = "/outbound/order-1/shipment";
	const standard = warehouseChildren({ ...options, mode: "standard" });
	const sandbox = warehouseChildren({ ...options, mode: "sandbox" });

	expect(matchRoutes(standard, shipmentPath)?.at(-1)?.params.orderId).toBe(
		"order-1",
	);
	expect(matchRoutes(sandbox, shipmentPath)?.at(-1)?.route.path).toBe("*");
	const map = matchRoutes(sandbox, "/map")?.at(-1)?.route.handle as
		WarehouseRouteHandle | undefined;
	expect(map).toEqual({
		warehouseSection: "map",
		resources: ["map", "catalog"],
	});
});
