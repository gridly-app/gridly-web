import { type ChangeEvent, type SubmitEvent, useState } from "react";
import type {
	Category,
	Cell,
	CommandExecutor,
	Warehouse,
} from "@/entities/warehouse";
import { cellKey } from "@/entities/warehouse";

import { errorMessage, id } from "@/shared/lib";

export interface ZonePanelOptions {
	w: Warehouse;
	cells: Cell[];
	keys: string[];
	editing: boolean;
	command: CommandExecutor;
	onDraft: (cells: Cell[]) => void;
	onCategory: (category: Category) => void;
}

export function useZonePanel({
	w: warehouse,
	cells,
	keys,
	onDraft,
	onCategory,
}: ZonePanelOptions) {
	const picked = cells.filter((cell) => keys.includes(cellKey(cell)));
	const first = picked[0];
	const partialZone =
		first?.zone &&
		cells.filter((cell) => cell.zone?.id === first.zone?.id).length >
			picked.length;
	const [name, setName] = useState(
		first?.zone
			? `${first.zone.name}${partialZone ? ` · блок ${first.x},${first.y}` : ""}`
			: "",
	);
	const [category, changeCategory] = useState(first?.zone?.categoryId || "");
	const [error, setError] = useState("");
	const [pending, setPending] = useState(false);
	const [adding, setAdding] = useState(false);
	const [newName, setNewName] = useState("");

	async function save(e: SubmitEvent<HTMLFormElement>) {
		e.preventDefault();
		setError("");
		setPending(true);
		try {
			if (!first) throw new Error("Выделите клетки хранения");
			const same =
				picked.every(
					(cell) => cell.zone?.id && cell.zone.id === first.zone?.id,
				) &&
				cells.filter((cell) => cell.zone?.id === first.zone?.id).length ===
					picked.length;
			const zone = {
				id: same && first.zone ? first.zone.id : id(),
				name,
				categoryId: category,
			};
			const chosen = new Set(keys);
			const next = cells.map((cell) =>
				chosen.has(cellKey(cell)) ? { ...cell, zone } : cell,
			);
			onDraft(next);
		} catch (e) {
			setError(errorMessage(e));
		} finally {
			setPending(false);
		}
	}

	async function addCategory() {
		setPending(true);
		setError("");
		try {
			if (!first) throw new Error("Выделите клетки хранения");
			if (!newName.trim()) {
				throw new Error("Введите название категории");
			}
			const categoryId = id();

			onCategory({
				id: categoryId,
				name: newName.trim(),
				cold: first.type === "cold",
			});
			changeCategory(categoryId);
			setAdding(false);
			setNewName("");
		} catch (e) {
			setError(errorMessage(e));
		} finally {
			setPending(false);
		}
	}

	const visibleCategories = warehouse.categories.filter((c) => !c.archived);
	const capacity: number | undefined = undefined;

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
		changeName,
		changeCategory,
		changeNewName,
		toggleAdding,
		capacity,
		visibleCategories,
		save,
		picked,
		first,
		name,
		category,
		adding,
		newName,
		pending,
		addCategory,
		error,
	};
}
