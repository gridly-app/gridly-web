import { type ChangeEvent, useState } from "react";
import type { Cell, CommandExecutor, Warehouse } from "@/entities/warehouse";
import { assignZone, cellKey } from "@/entities/warehouse";
import { errorMessage, id } from "@/shared/lib";

export interface ZonePanelOptions {
	w: Warehouse;
	cells: Cell[];
	keys: string[];
	editing: boolean;
	command: CommandExecutor;
	onDraft: (cells: Cell[]) => void;
}

export function useZonePanel({
	w: warehouse,
	cells,
	keys,
	editing,
	onDraft,
	command,
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

	async function save(e: React.FormEvent) {
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
			const next = assignZone(cells, keys, zone, warehouse.categories);

			if (editing) {
				await command("draft", next);
			} else {
				await command("zone", { keys, zone });
			}
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

			await command("category", {
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

	const visibleCategories = warehouse.categories.filter(
		(c) => (c.cold ? "cold" : "storage") === first?.type,
	);

	const capacity = picked.reduce((total, cell) => total + cell.capacity, 0);

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
