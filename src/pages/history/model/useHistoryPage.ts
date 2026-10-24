import { useState } from "react";
import { selectHistoryLive, useLiveWarehouseScope } from "@/entities/warehouse";

export function useHistoryPage() {
	const { warehouse } = useLiveWarehouseScope(selectHistoryLive);
	const [search, setSearch] = useState("");
	const searchQuery = search.toLowerCase();

	const visibleEvents = warehouse.events.filter((e) =>
		(e.title + e.detail).toLowerCase().includes(searchQuery),
	);

	return {
		empty: warehouse.events.length === 0,
		visibleEvents,
		search,
		setSearch,
	};
}
