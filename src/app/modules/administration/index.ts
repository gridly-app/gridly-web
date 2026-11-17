import { shipmentAdministrationPath } from "@/ports/navigation";

export const administrationRoute = {
	id: "administration",
	path: shipmentAdministrationPath,
	access: ["standard", "sandbox"],
	load: () =>
		import("./Administration").then(({ Administration }) => ({
			default: Administration,
		})),
} as const;
