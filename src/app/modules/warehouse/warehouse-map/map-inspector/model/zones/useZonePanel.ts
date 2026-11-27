import { type ChangeEvent, type SubmitEvent, useState } from "react";

import {
	type Category,
	type Cell,
	cellKey,
	type WarehouseView,
} from "@/domain/warehouse";
import { errorMessage, id, UserError } from "@/shared/lib";

export interface ZonePanelOptions {
	warehouse: Pick<WarehouseView<"catalog">, "categories">;
	cells: Cell[];
	keys: string[];
	onDraft: (cells: Cell[]) => void;
	onCategory: (category: Category) => void;
}

function zoneSize(cells: Cell[], zoneId: string | undefined) {
	return cells.filter((cell) => cell.zone?.id === zoneId).length;
}

function totalCapacity(cells: Cell[]) {
	if (!cells.length || cells.some((cell) => cell.capacity === undefined))
		return undefined;

	return cells.reduce((sum, cell) => sum + (cell.capacity ?? 0), 0);
}

export function useZonePanel({
	warehouse,
	cells,
	keys,
	onDraft,
	onCategory,
}: ZonePanelOptions) {
	const picked = cells.filter((cell) => keys.includes(cellKey(cell)));
	const first = picked[0];
	const firstZone = first?.zone;
	const isPartialZone =
		Boolean(firstZone) && zoneSize(cells, firstZone?.id) > picked.length;
	const initialName = firstZone
		? `${firstZone.name}${isPartialZone ? " · часть зоны" : ""}`
		: "";
	const [name, setName] = useState(initialName);
	const [category, changeCategory] = useState(firstZone?.categoryId || "");
	const [error, setError] = useState("");
	const [adding, setAdding] = useState(false);
	const [newName, setNewName] = useState("");
	const visibleCategories = warehouse.categories.filter(
		(item) => !item.archived,
	);
	const capacity = totalCapacity(picked);

	function applyZone(storageCell: Cell) {
		const isWholeZone =
			picked.every(
				(cell) => cell.zone?.id && cell.zone.id === storageCell.zone?.id,
			) && zoneSize(cells, storageCell.zone?.id) === picked.length;
		const zone = {
			id: isWholeZone && storageCell.zone ? storageCell.zone.id : id(),
			name,
			categoryId: category,
		};
		const chosen = new Set(keys);

		onDraft(
			cells.map((cell) =>
				chosen.has(cellKey(cell)) ? { ...cell, zone } : cell,
			),
		);
	}

	function save(event: SubmitEvent<HTMLFormElement>) {
		event.preventDefault();
		setError("");

		try {
			if (!first) throw new UserError("Выделите клетки хранения");

			applyZone(first);
		} catch (saveError) {
			setError(errorMessage(saveError));
		}
	}

	function addCategory() {
		const categoryName = newName.trim();

		setError("");

		try {
			if (!first) throw new UserError("Выделите клетки хранения");
			if (!categoryName) throw new UserError("Введите название категории");

			const categoryId = id();

			onCategory({
				id: categoryId,
				name: categoryName,
				cold: first.type === "cold",
			});
			changeCategory(categoryId);
			setAdding(false);
			setNewName("");
		} catch (categoryError) {
			setError(errorMessage(categoryError));
		}
	}

	function changeName(event: ChangeEvent<HTMLInputElement>) {
		setName(event.target.value);
	}

	function changeNewName(event: ChangeEvent<HTMLInputElement>) {
		setNewName(event.target.value);
	}

	function toggleAdding() {
		setAdding((value) => !value);
	}

	return {
		picked,
		first,
		capacity,
		name,
		changeName,
		category,
		changeCategory,
		visibleCategories,
		adding,
		toggleAdding,
		newName,
		changeNewName,
		addCategory,
		save,
		error,
	};
}
