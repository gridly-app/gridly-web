import { useWarehouses } from "@/entities/warehouse";
import { useSession } from "@/shared/auth";

export function useLandingPage() {
	const { isDemo } = useSession();
	const query = useWarehouses();
	const last = isDemo ? null : localStorage.getItem("gridly.last");
	const warehouseId = query.data?.some((warehouse) => warehouse.id === last)
		? last
		: query.data?.[0]?.id || "new";

	function retry() {
		void query.refetch();
	}

	return {
		pending: query.isPending,
		error: query.error,
		target: `/warehouses/${warehouseId}/map`,
		retry,
	};
}
