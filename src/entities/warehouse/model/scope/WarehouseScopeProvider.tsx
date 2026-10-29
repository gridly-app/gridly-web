import type { WarehouseScopeProviderProps } from "./warehouseScope";
import {
	WarehouseCommandsContext,
	WarehouseDataContext,
	WarehousePendingContext,
} from "./warehouseScope";

export function WarehouseScopeProvider({
	value,
	children,
}: WarehouseScopeProviderProps) {
	return (
		<WarehouseDataContext.Provider value={value.warehouse}>
			<WarehouseCommandsContext.Provider
				value={{ execute: value.execute, command: value.command }}
			>
				<WarehousePendingContext.Provider value={value.pending}>
					{children}
				</WarehousePendingContext.Provider>
			</WarehouseCommandsContext.Provider>
		</WarehouseDataContext.Provider>
	);
}
