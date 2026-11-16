export const shipmentPortalRoute = {
	id: "shipment-portal",
	path: "/shipments",
	access: "public",
	load: () =>
		import("./ShipmentPortal").then(({ ShipmentPortal }) => ({
			default: ShipmentPortal,
		})),
} as const;
