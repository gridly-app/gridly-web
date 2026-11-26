import type {
	Category,
	Event,
	Order,
	Product,
	Robot,
	Stock,
	Warehouse,
	WarehouseSettings,
} from "./warehouse";
import type { BlockRoutePlan, Cell } from "./layout/layout";
import type { WriteOff } from "./inventory";

export interface WarehouseLayout extends Pick<
	Warehouse,
	"version" | "width" | "height" | "published"
> {
	cells: Cell[];
	draft: Cell[] | null;
	routePlans?: BlockRoutePlan[] | undefined;
	draftRoutes?: BlockRoutePlan[] | undefined;
	draftRevision?: number | undefined;
}

export interface WarehouseRobots {
	robots: Robot[];
}

export interface WarehouseCatalog {
	categories: Category[];
	products: Product[];
}

export interface WarehouseStock {
	stock: Stock[];
}

export interface WarehouseOrders {
	orders: Order[];
}

export interface WarehouseEvents {
	events: Event[];
	writeOffs?: WriteOff[] | undefined;
}

export interface WarehouseResourceTypes {
	metadata: Warehouse;
	map: WarehouseLayout;
	robots: WarehouseRobots;
	catalog: WarehouseCatalog;
	inventory: WarehouseStock;
	orders: WarehouseOrders;
	history: WarehouseEvents;
	settings: { settings: WarehouseSettings };
}

export type WarehouseResource = keyof WarehouseResourceTypes;

type WarehouseFields = Warehouse &
	WarehouseLayout &
	WarehouseRobots &
	WarehouseCatalog &
	WarehouseStock &
	WarehouseOrders &
	WarehouseEvents &
	WarehouseResourceTypes["settings"];

type ResourceFields<Resource extends WarehouseResource> =
	Resource extends WarehouseResource
		? keyof WarehouseResourceTypes[Resource]
		: never;

export type WarehouseResourceData<Resource extends WarehouseResource> = Pick<
	WarehouseFields,
	ResourceFields<Resource>
>;

export type WarehouseView<Resource extends WarehouseResource = never> =
	Warehouse & WarehouseResourceData<Resource>;
