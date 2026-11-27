import { useState } from "react";

import type { Category, CommandExecutor } from "@/domain/warehouse";
import { ListFilters } from "@/shared/ui/dataDisplay";
import { Feedback } from "@/shared/ui/feedback";
import { FormShell, Select } from "@/shared/ui/forms";

import {
	assignedStorageCells,
	categoryStorageRows,
	categoryStorageZones,
	type StorageZoneRow,
} from "../../model/categoryStorage";
import type { CatalogLayoutWarehouse } from "../../model/warehouseResources";
import { StorageZoneFields } from "../StorageZoneFields/StorageZoneFields";

const assignmentOptions = [
	{ value: "all", label: "Все зоны" },
	{ value: "assigned", label: "Закреплены за категорией" },
	{ value: "unassigned", label: "Без категории" },
];

export function CategoryStorage({
	category,
	warehouse,
	execute,
	isPending,
}: {
	category: Category;
	warehouse: CatalogLayoutWarehouse;
	execute: CommandExecutor;
	isPending: boolean;
}) {
	const [search, setSearch] = useState("");
	const [assignment, setAssignment] = useState("all");
	const zones = categoryStorageZones(category.id, warehouse.cells);
	const hasDraft = Boolean(warehouse.draft);
	const canEdit =
		Boolean(warehouse.allowedActions?.includes("save-map")) &&
		!hasDraft &&
		!category.archived;
	const rows = categoryStorageRows(
		zones,
		warehouse.stock,
		category.id,
		canEdit,
	);
	const searchQuery = search.trim().toLowerCase();
	const isEditable = canEdit && zones.size > 0;
	const searchField = {
		"aria-label": "Поиск по зонам хранения",
		value: search,
		onChange: setSearch,
	};

	function matchesFilters(row: StorageZoneRow) {
		const matchesAssignment =
			assignment === "all" || row.isAssigned === (assignment === "assigned");

		return matchesAssignment && row.name.toLowerCase().includes(searchQuery);
	}

	const hasNoResults = !rows.some(matchesFilters);

	async function handleSave(data: FormData) {
		const cells = assignedStorageCells(data, warehouse.cells, zones, category);

		if (!cells) return;

		await execute("saveMap", {
			cells,
			routes: warehouse.routePlans ?? [],
			baseVersion: warehouse.version,
		});
	}

	function handleResetAssignment() {
		setAssignment("all");
	}

	function handleInvalidZone() {
		setSearch("");
		setAssignment("all");
	}

	const zoneFields = (
		<>
			{rows.map((row) => (
				<StorageZoneFields
					key={row.id}
					row={row}
					isVisible={matchesFilters(row)}
					canEdit={canEdit}
					isPending={isPending}
					onInvalid={handleInvalidZone}
				/>
			))}
			{hasNoResults && <p>Нет зон по выбранным фильтрам и поиску.</p>}
		</>
	);

	return (
		<>
			{hasDraft && (
				<Feedback tone="info">
					Сохраните или отмените черновик карты, чтобы изменить зоны категории.
				</Feedback>
			)}
			{rows.length > 0 && (
				<ListFilters
					search={searchField}
					count={Number(assignment !== "all")}
					onReset={handleResetAssignment}
				>
					<Select
						aria-label="Закрепление зоны"
						value={assignment}
						onValueChange={setAssignment}
						options={assignmentOptions}
					/>
				</ListFilters>
			)}
			{isEditable && (
				<FormShell
					onSubmit={handleSave}
					pending={isPending}
					submitLabel="Сохранить правила хранения"
				>
					<p>
						Отметьте зоны для этой категории. Указанный лимит применяется к
						каждой клетке выбранной зоны.
					</p>
					{zoneFields}
				</FormShell>
			)}
			{!isEditable && rows.length > 0 && zoneFields}
			{!isEditable && rows.length === 0 && (
				<p>Для категории пока нет зон хранения.</p>
			)}
		</>
	);
}
