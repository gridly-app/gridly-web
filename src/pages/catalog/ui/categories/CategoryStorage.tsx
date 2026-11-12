import { useState } from "react";
import type {
	Category,
	CommandExecutor,
	Warehouse,
} from "@/entities/warehouse";
import { ListFilters } from "@/shared/ui/dataDisplay";
import { Feedback } from "@/shared/ui/feedback";
import { FormShell, Select } from "@/shared/ui/forms";
import {
	assignedStorageCells,
	categoryStorageRows,
	categoryStorageZones,
} from "../../model/categoryStorage";
import { StorageZoneFields } from "./StorageZoneFields";

export function CategoryStorage({
	category,
	warehouse,
	execute,
	pending,
}: {
	category: Category;
	warehouse: Warehouse;
	execute: CommandExecutor;
	pending: boolean;
}) {
	const [search, setSearch] = useState("");
	const [assignment, setAssignment] = useState("all");
	const zones = categoryStorageZones(category.id, warehouse.cells);
	const hasDraft = !!warehouse.draft;
	const canEdit =
		!!warehouse.allowedActions?.includes("save-map") &&
		!hasDraft &&
		!category.archived;

	async function save(data: FormData) {
		const cells = assignedStorageCells(data, warehouse.cells, zones, category);
		if (!cells) return;
		await execute("saveMap", {
			cells,
			routes: warehouse.routePlans ?? [],
			baseVersion: warehouse.version,
		});
	}

	const rows = categoryStorageRows(
		zones,
		warehouse.stock,
		category.id,
		canEdit,
	);
	const query = search.trim().toLowerCase();
	const matchesFilters = (row: (typeof rows)[number]) =>
		(assignment === "all" || row.assigned === (assignment === "assigned")) &&
		row.name.toLowerCase().includes(query);
	const zoneElements = rows.map((row) => (
		<StorageZoneFields
			key={row.id}
			row={row}
			visible={matchesFilters(row)}
			canEdit={canEdit}
			pending={pending}
			onInvalid={() => {
				setSearch("");
				setAssignment("all");
			}}
		/>
	));
	const noResults = !rows.some(matchesFilters);
	const emptyMessage = <p>Нет зон по выбранным фильтрам и поиску.</p>;

	return (
		<>
			{hasDraft && (
				<Feedback tone="info">
					Сохраните или отмените черновик карты, чтобы изменить зоны категории.
				</Feedback>
			)}
			{rows.length > 0 && (
				<ListFilters
					search={{
						"aria-label": "Поиск по зонам хранения",
						value: search,
						onChange: setSearch,
					}}
					count={Number(assignment !== "all")}
					onReset={() => setAssignment("all")}
				>
					<Select
						aria-label="Закрепление зоны"
						value={assignment}
						onValueChange={setAssignment}
						options={[
							{ value: "all", label: "Все зоны" },
							{ value: "assigned", label: "Закреплены за категорией" },
							{ value: "unassigned", label: "Без категории" },
						]}
					/>
				</ListFilters>
			)}
			{canEdit && zones.size > 0 ? (
				<FormShell
					onSubmit={save}
					pending={pending}
					submitLabel="Сохранить правила хранения"
				>
					<p>
						Отметьте зоны для этой категории. Указанный лимит применяется к
						каждой клетке выбранной зоны.
					</p>
					{zoneElements}
					{noResults && emptyMessage}
				</FormShell>
			) : rows.length > 0 ? (
				<>
					{zoneElements}
					{noResults && emptyMessage}
				</>
			) : (
				<p>Для категории пока нет зон хранения.</p>
			)}
		</>
	);
}
