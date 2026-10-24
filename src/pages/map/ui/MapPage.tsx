import { selectMapLive, useLiveWarehouseScope } from "@/entities/warehouse";
import { useTheme } from "@/shared/lib";
import { WarehouseMap } from "./map/WarehouseMap";

export function MapPage() {
	const { warehouse, execute, pending } = useLiveWarehouseScope(selectMapLive);
	const { dark } = useTheme();

	return (
		<WarehouseMap
			key={warehouse.id}
			w={warehouse}
			command={execute}
			pending={pending}
			dark={dark}
		/>
	);
}
