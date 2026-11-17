import { skipToken, useQuery } from "@tanstack/react-query";
import type { LayoutOperation } from "@/ports/warehouse";
import { useWarehouseRepository } from "../WarehouseRepositoryProvider";

export function useLayoutOperation(id: string) {
	const repository = useWarehouseRepository();
	const warehouseKeys = repository.keys;
	const { data } = useQuery<LayoutOperation | null>({
		queryKey: warehouseKeys.layoutOperation(id),
		queryFn: skipToken,
		initialData: null,
		staleTime: Infinity,
	});

	return {
		operation: data ?? null,
		retryRead: () => repository.retryLayoutRead(id),
		discardRejected: () => repository.discardRejectedLayout(id),
	};
}
