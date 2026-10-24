import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useWarehouseLivePolling } from "../../api/queries/queries";
import { warehouseKeys } from "../../api/queries/queryKeys";
import type { Warehouse } from "../warehouse/schemas";
import type { WarehouseScopeProviderProps } from "./warehouseScope";
import {
	WarehouseCommandsContext,
	WarehouseDataContext,
	WarehousePendingContext,
} from "./warehouseScope";

function WarehouseLivePolling({ id }: { id: string }) {
	useWarehouseLivePolling(id);
	return null;
}

function WarehouseAvailability({
	warehouse,
	pending,
	children,
}: {
	warehouse: Warehouse;
	pending: boolean;
	children: ReactNode;
}) {
	const live = useQuery({
		queryKey: warehouseKeys.live(warehouse.id),
		enabled: false,
	});
	return (
		<WarehousePendingContext.Provider value={pending || live.isError}>
			{children}
		</WarehousePendingContext.Provider>
	);
}

export function WarehouseScopeProvider({
	value,
	children,
}: WarehouseScopeProviderProps) {
	return (
		<WarehouseDataContext.Provider value={value.warehouse}>
			<WarehouseCommandsContext.Provider
				value={{ execute: value.execute, command: value.command }}
			>
				<WarehouseAvailability
					warehouse={value.warehouse}
					pending={value.pending}
				>
					<WarehouseLivePolling
						key={value.warehouse.id}
						id={value.warehouse.id}
					/>
					{children}
				</WarehouseAvailability>
			</WarehouseCommandsContext.Provider>
		</WarehouseDataContext.Provider>
	);
}
