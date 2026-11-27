import { useState } from "react";

import type { Event } from "@/domain/warehouse";
import { useWarehouseScreen } from "@/ports/warehouse";
import { dateKey } from "@/shared/lib";

import { historyEventGroup, historyGroupLabel } from "./eventGroup";

const readyEventTitle = "Склад готов к работе";

export type HistoryEvent = Event & { group: string; groupLabel: string };

type HistoryFilter = {
	category: string;
	from: string;
	to: string;
	searchQuery: string;
	timeZone: string;
};

function isInRange(day: string | null, from: string, to: string) {
	if (from && (!day || day < from)) return false;
	if (to && (!day || day > to)) return false;

	return true;
}

function matchesFilter(
	event: HistoryEvent,
	{ category, from, to, searchQuery, timeZone }: HistoryFilter,
) {
	const day = dateKey(event.time, timeZone);
	const matchesCategory = category === "all" || event.group === category;
	const matchesSearch = `${event.title} ${event.detail}`
		.toLowerCase()
		.includes(searchQuery);

	return matchesCategory && isInRange(day, from, to) && matchesSearch;
}

export function useHistoryPage() {
	const { warehouse } = useWarehouseScreen(["history"]);
	const [search, setSearch] = useState("");
	const [category, setCategory] = useState("all");
	const [from, setFrom] = useState("");
	const [to, setTo] = useState("");
	const [sort, setSort] = useState("newest");
	const isRangeValid = !from || !to || from <= to;
	const direction = sort === "newest" ? 1 : -1;
	const filter = {
		category,
		from,
		to,
		searchQuery: search.trim().toLowerCase(),
		timeZone: warehouse.timezone,
	};
	const events = warehouse.events
		.filter((event) => !event.warehouseId || event.warehouseId === warehouse.id)
		.filter((event) => event.title.trim() !== readyEventTitle)
		.map((event): HistoryEvent => {
			const group = historyEventGroup(event);

			return { ...event, group, groupLabel: historyGroupLabel(group) };
		});
	const visibleEvents = isRangeValid
		? events
				.filter((event) => matchesFilter(event, filter))
				.sort((a, b) => (Date.parse(b.time) - Date.parse(a.time)) * direction)
		: [];
	const groups = [...new Set(events.map((event) => event.group))].map(
		(value) => ({
			value,
			label: historyGroupLabel(value),
		}),
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
		groups,
		isRangeValid,
		isEmpty: events.length === 0,
		timezone: warehouse.timezone,
	};
}
