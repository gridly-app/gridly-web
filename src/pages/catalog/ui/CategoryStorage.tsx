import { useState } from "react";
import {
	type Category,
	type Cell,
	type CommandExecutor,
	cellKey,
	storageCellTypes,
	type Warehouse,
} from "@/entities/warehouse";
import {
	Checkbox,
	Feedback,
	Field,
	FormShell,
	Input,
	Label,
	ListFilters,
	Select,
} from "@/shared/ui";

const number = new Intl.NumberFormat("ru-RU");

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
	const zones = new Map<string, Cell[]>();
	for (const cell of warehouse.cells) {
		if (!cell.zone || !storageCellTypes.includes(cell.type)) continue;
		if (cell.zone.categoryId && cell.zone.categoryId !== category.id) continue;
		const cells = zones.get(cell.zone.id) ?? [];
		cells.push(cell);
		zones.set(cell.zone.id, cells);
	}
	const stockByCell = new Map<string, number>();
	for (const stock of warehouse.stock) {
		stockByCell.set(
			stock.cell,
			(stockByCell.get(stock.cell) ?? 0) + stock.quantity,
		);
	}
	const hasDraft = !!warehouse.draft;
	const canEdit =
		!!warehouse.allowedActions?.includes("save-map") &&
		!hasDraft &&
		!category.archived;

	async function save(data: FormData) {
		const selected = new Set(data.getAll("zone"));
		const cells = warehouse.cells.map((cell): Cell => {
			const zone = cell.zone;
			if (!zone || !zones.has(zone.id) || !storageCellTypes.includes(cell.type))
				return cell;
			const assigned = selected.has(zone.id);
			const limit = data.get(`capacity:${zone.id}`);
			return {
				...cell,
				type: assigned ? (category.cold ? "cold" : "storage") : cell.type,
				zone: { ...zone, categoryId: assigned ? category.id : "" },
				capacity:
					assigned && typeof limit === "string" && limit !== ""
						? Number(limit)
						: cell.capacity,
			};
		});
		if (
			cells.every((cell, index) => {
				const old = warehouse.cells[index];
				return (
					cell.type === old?.type &&
					cell.capacity === old?.capacity &&
					cell.zone?.categoryId === old?.zone?.categoryId
				);
			})
		)
			return;
		await execute("saveMap", {
			cells,
			routes: warehouse.routePlans ?? [],
			baseVersion: warehouse.version,
		});
	}

	const rows = [...zones].map(([id, cells]) => {
		const zone = cells[0]?.zone;
		if (!zone) return null;
		const assigned = zone.categoryId === category.id;
		if (!canEdit && !assigned) return null;
		const firstCapacity = cells[0]?.capacity;
		const uniform = cells.every((cell) => cell.capacity === firstCapacity);
		const capacity = cells.reduce(
			(total, cell) => total + (cell.capacity ?? 0),
			0,
		);
		const quantity = cells.reduce(
			(total, cell) => total + (stockByCell.get(cellKey(cell)) ?? 0),
			0,
		);
		const visible =
			(assignment === "all" || assigned === (assignment === "assigned")) &&
			zone.name.toLowerCase().includes(search.trim().toLowerCase());
		return {
			visible,
			element: (
				<section
					className={visible ? "grid gap-2 rounded-lg border p-3" : "hidden"}
					key={id}
				>
					{canEdit ? (
						<Label className="flex items-center gap-2">
							<Checkbox
								name="zone"
								value={id}
								defaultChecked={assigned}
								disabled={pending}
							/>
							{zone.name}
						</Label>
					) : (
						<strong>{zone.name}</strong>
					)}
					<p>
						{cells.length} кл. · вместимость {number.format(capacity)} м³ · на
						хранении {number.format(quantity)} шт.
					</p>
					{canEdit && (
						<Field label={`Лимит на клетку, м³ · ${zone.name}`}>
							<Input
								type="number"
								min={0}
								step="any"
								name={`capacity:${id}`}
								defaultValue={uniform ? firstCapacity : undefined}
								placeholder={uniform ? undefined : "Разные лимиты в клетках"}
								disabled={pending}
								onInvalid={() => {
									setSearch("");
									setAssignment("all");
								}}
							/>
						</Field>
					)}
				</section>
			),
		};
	});
	const zoneElements = rows.map((row) => row?.element);
	const noResults = !rows.some((row) => row?.visible);
	const emptyMessage = <p>Нет зон по выбранным фильтрам и поиску.</p>;

	return (
		<>
			{hasDraft && (
				<Feedback tone="info">
					Сохраните или отмените черновик карты, чтобы изменить зоны категории.
				</Feedback>
			)}
			{rows.some(Boolean) && (
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
			) : rows.some(Boolean) ? (
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
