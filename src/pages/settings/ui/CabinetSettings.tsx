import { IconTrash } from "@tabler/icons-react";
import { useId, useState } from "react";
import {
	type Cell,
	type CommandExecutor,
	useRouteProposal,
	type Warehouse,
} from "@/entities/warehouse";
import { errorMessage } from "@/shared/lib";
import {
	Button,
	Checkbox,
	Field,
	Form,
	FormActions,
	IconButton,
	Input,
	Label,
	Select,
} from "@/shared/ui";

import styles from "./SettingsPage.module.css";

const defaults: NonNullable<Warehouse["cabinet"]> = {
	location: "",
	placement: "fefo",
	allowMixedCategories: false,
	reserveOnStart: true,
	lowStockThreshold: 10,
};
export function CabinetSettings({
	w,
	execute,
	pending,
	section,
}: {
	w: Warehouse;
	execute: CommandExecutor;
	pending: boolean;
	section: "policies" | "zones";
}) {
	const mixedId = useId(),
		reserveId = useId();
	const [cabinet, setCabinet] = useState(w.cabinet ?? defaults);
	const [message, setMessage] = useState("");
	const [saving, setSaving] = useState(false);
	const [zoneId, setZoneId] = useState("new"),
		[zoneName, setZoneName] = useState(""),
		[category, setCategory] = useState(""),
		[coordinates, setCoordinates] = useState("");
	const proposal = useRouteProposal(w.id);
	const zones = [
		...new Map(
			w.cells.flatMap((c) => (c.zone ? [[c.zone.id, c.zone] as const] : [])),
		).values(),
	];
	const canEdit = !!w.allowedActions?.includes("edit-settings");
	const canMap = !!w.allowedActions?.includes("save-map");
	const busy = pending || saving;
	async function saveCabinet() {
		setSaving(true);
		setMessage("");
		try {
			await execute("cabinet", {
				...cabinet,
				location: w.cabinet?.location || w.location || "",
				reportViews: w.cabinet?.reportViews,
			});
			setMessage("Настройки сохранены");
		} catch (e) {
			setMessage(errorMessage(e));
		} finally {
			setSaving(false);
		}
	}
	function selectZone(id: string) {
		setZoneId(id);
		const z = zones.find((z) => z.id === id);
		setZoneName(z?.name ?? "");
		setCategory(z?.categoryId ?? "");
		setCoordinates(
			w.cells
				.filter((c) => c.zone?.id === id)
				.map((c) => `${c.x},${c.y}`)
				.join(" "),
		);
	}
	async function saveZone(remove = false) {
		setSaving(true);
		setMessage("");
		try {
			const keys = new Set(coordinates.trim().split(/\s+/).filter(Boolean));
			const cat = w.categories.find((c) => c.id === category);
			if (!remove && (!zoneName.trim() || !cat || !keys.size))
				throw new Error("Укажите название, категорию и клетки зоны");
			if (
				!remove &&
				[...keys].some(
					(key) =>
						!w.cells.some(
							(c) =>
								`${c.x},${c.y}` === key && ["storage", "cold"].includes(c.type),
						),
				)
			)
				throw new Error(
					"Зона может включать только клетки хранения. Формат: 1,1 2,1",
				);
			const id = zoneId === "new" ? crypto.randomUUID() : zoneId;
			const cells: Cell[] = w.cells.map((c) => {
				if (!remove && keys.has(`${c.x},${c.y}`))
					return {
						...c,
						type: cat?.cold ? "cold" : "storage",
						zone: { id, name: zoneName.trim(), categoryId: category },
					};
				return c.zone?.id === id ? { ...c, zone: undefined } : c;
			});
			const routes = await proposal.mutateAsync(cells);
			await execute("saveMap", {
				cells,
				routes,
				baseVersion: w.version,
				draftRevision: w.draftRevision,
			});
			selectZone("new");
			setMessage("Зоны сохранены");
		} catch (e) {
			setMessage(errorMessage(e));
		} finally {
			setSaving(false);
		}
	}
	return (
		<section className={styles.card}>
			{section === "policies" && (
				<Form
					onSubmit={(e) => {
						e.preventDefault();
						void saveCabinet();
					}}
				>
					<h3>Размещение товаров</h3>

					<Field label="Правило размещения">
						<Select
							aria-label="Правило размещения"
							value={cabinet.placement}
							onValueChange={(v) =>
								setCabinet({ ...cabinet, placement: v as "fifo" | "fefo" })
							}
							options={[
								{ value: "fifo", label: "FIFO — сначала поступившие" },
								{ value: "fefo", label: "FEFO — ближайший срок годности" },
							]}
						/>
					</Field>
					<Label htmlFor={mixedId}>
						<Checkbox
							id={mixedId}
							checked={cabinet.allowMixedCategories}
							onCheckedChange={(v) =>
								setCabinet({ ...cabinet, allowMixedCategories: v })
							}
						/>{" "}
						Смешивать категории в зоне
					</Label>
					<Label htmlFor={reserveId}>
						<Checkbox
							id={reserveId}
							checked={cabinet.reserveOnStart}
							onCheckedChange={(v) =>
								setCabinet({ ...cabinet, reserveOnStart: v })
							}
						/>{" "}
						Резервировать остатки при запуске заказа
					</Label>
					<Field label="Порог низкого остатка, шт.">
						<Input
							type="number"
							min={0}
							step={1}
							required
							value={cabinet.lowStockThreshold}
							onChange={(e) =>
								setCabinet({
									...cabinet,
									lowStockThreshold: Number(e.target.value),
								})
							}
						/>
					</Field>
					<Button type="submit" disabled={busy || !canEdit}>
						Сохранить
					</Button>
				</Form>
			)}
			{section === "zones" && (
				<Form
					onSubmit={(e) => {
						e.preventDefault();
						void saveZone();
					}}
				>
					<h3>Зоны склада</h3>
					<Select
						aria-label="Зона"
						value={zoneId}
						onValueChange={selectZone}
						options={[
							{ value: "new", label: "Новая зона" },
							...zones.map((z) => ({ value: z.id, label: z.name })),
						]}
					/>
					<Field label="Название зоны">
						<Input
							required
							maxLength={80}
							value={zoneName}
							onChange={(e) => setZoneName(e.target.value)}
						/>
					</Field>
					<Select
						aria-label="Категория зоны"
						value={category}
						onValueChange={setCategory}
						options={[
							{ value: "", label: "Выберите категорию" },
							...w.categories
								.filter((c) => !c.archived)
								.map((c) => ({ value: c.id, label: c.name })),
						]}
					/>
					<Field label="Клетки хранения (x,y через пробел)">
						<Input
							required
							placeholder="1,1 2,1 3,1"
							value={coordinates}
							onChange={(e) => setCoordinates(e.target.value)}
						/>
					</Field>
					<FormActions>
						<Button type="submit" disabled={busy || !canMap}>
							Сохранить
						</Button>
						<IconButton
							label="Удалить зону"
							icon={<IconTrash size={16} />}
							variant="destructive"
							disabled={busy || !canMap || zoneId === "new"}
							onClick={() => void saveZone(true)}
						/>
					</FormActions>
				</Form>
			)}
			<p role="status">{message}</p>
		</section>
	);
}
