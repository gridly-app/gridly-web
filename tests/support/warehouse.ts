import {
	type Warehouse,
	warehouseSchema,
} from "../../src/entities/warehouse/model/warehouse/schemas";
export function warehouse(): Warehouse {
	return warehouseSchema.parse({
		id: "w",
		name: "Test",
		location: "",
		width: 3,
		height: 3,
		timezone: "UTC",
		published: true,
		version: 1,
		stateVersion: "1",
		running: true,
		tick: "1",
		cells: [{ x: 1, y: 1, type: "aisle" }],
		draft: null,
		robots: [
			{
				id: "r",
				name: "Robot",
				revision: 1,
				roles: ["unload"],
				x: 0,
				y: 0,
				speed: 1,
				duration: 1,
				capacity: "10",
				status: "idle",
			},
		],
		products: [
			{
				id: "p",
				name: "Product",
				sku: "sku",
				category: "c",
				volume: "1",
				price: "1",
				shelf: 0,
				revision: 2,
			},
		],
		categories: [{ id: "c", name: "Category", cold: false, revision: 3 }],
		stock: [
			{
				id: "s",
				product: "p",
				quantity: 10,
				availableQuantity: 8,
				reserved: 2,
				expires: "",
				cell: "1,1",
				canWriteOff: true,
			},
		],
		orders: [],
		events: [],
		policy: {
			confirmUnload: false,
			confirmPick: false,
			confirmPutaway: false,
			confirmLoad: false,
		},
	});
}
