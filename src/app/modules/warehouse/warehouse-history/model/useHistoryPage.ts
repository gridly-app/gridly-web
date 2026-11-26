import { useState } from "react";
import { useWarehouseScreen } from "@/ports/warehouse";
import { dateKey } from "@/shared/lib";

import {
	historyEventGroup as group,
	historyGroupLabels as labels,
} from "./eventGroup";

export function useHistoryPage() {
	const { warehouse } = useWarehouseScreen(["id", "timezone", "events"]);
	const [search, setSearch] = useState("");
	const [category, setCategory] = useState("all");
	const [from, setFrom] = useState("");
	const [to, setTo] = useState("");
	const [sort, setSort] = useState("newest");
	const query = search.trim().toLowerCase();
	const valid = !from || !to || from <= to;
	const events = warehouse.events
		.filter(
			(event) =>
				(!event.warehouseId || event.warehouseId === warehouse.id) &&
				event.title.trim() !== "Склад готов к работе",
		)
		.map((event) => ({
			...event,
			group: group(event),
			groupLabel: labels[group(event)] ?? "Склад",
		}));
	const visibleEvents = events
		.filter((event) => {
			const day = dateKey(event.time, warehouse.timezone);
			return (
				valid &&
				(category === "all" || event.group === category) &&
				(!from || (!!day && day >= from)) &&
				(!to || (!!day && day <= to)) &&
				`${event.title} ${event.detail}`.toLowerCase().includes(query)
			);
		})
		.sort(
			(a, b) =>
				(Date.parse(b.time) - Date.parse(a.time)) *
				(sort === "newest" ? 1 : -1),
		);
	return {
		visibleEvents,
		search,
		setSearch,
		category,
		setCategory,
		from,
		setFrom,
		to,
		setTo,
		sort,
		setSort,
		valid,
		timezone: warehouse.timezone,
		empty: events.length === 0,
		groups: [...new Set(events.map((event) => event.group))].map((value) => ({
			value,
			label: labels[value] ?? "Склад",
		})),
		hasFilters:
			!!search || category !== "all" || !!from || !!to || sort !== "newest",
		reset: () => {
			setSearch("");
			setCategory("all");
			setFrom("");
			setTo("");
			setSort("newest");
		},
	};
}
