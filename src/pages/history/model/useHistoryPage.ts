import { useState } from "react";
import { selectHistoryLive, useLiveWarehouseScope } from "@/entities/warehouse";

import {
	historyEventGroup as group,
	historyGroupLabels as labels,
} from "./eventGroup";

export function useHistoryPage() {
	const { warehouse } = useLiveWarehouseScope(selectHistoryLive);
	const [search, setSearch] = useState("");
	const [category, setCategory] = useState("all");
	const [from, setFrom] = useState("");
	const [to, setTo] = useState("");
	const [sort, setSort] = useState("newest");
	const query = search.trim().toLowerCase();
	const formatter = new Intl.DateTimeFormat("en-CA", {
		timeZone: warehouse.timezone,
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	});
	const valid = !from || !to || from <= to;
	const events = warehouse.events.map((event) => ({
		...event,
		group: group(event),
		groupLabel: labels[group(event)] ?? "Склад",
	}));
	const visibleEvents = events
		.filter((event) => {
			const time = Date.parse(event.time);
			const parts = Number.isFinite(time)
				? formatter.formatToParts(new Date(time))
				: [];
			const part = (type: Intl.DateTimeFormatPartTypes) =>
				parts.find((item) => item.type === type)?.value ?? "";
			const day = parts.length
				? `${part("year")}-${part("month")}-${part("day")}`
				: "";
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
		empty: warehouse.events.length === 0,
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
