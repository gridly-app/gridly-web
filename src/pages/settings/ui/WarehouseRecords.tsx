import { IconTrash } from "@tabler/icons-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { CommandExecutor, Stock, Warehouse } from "@/entities/warehouse";
import { useWorkspaceMode } from "@/shared/auth";
import { warehousePath } from "@/shared/config";
import { errorMessage } from "@/shared/lib";
import {
	Button,
	ConfirmDialog,
	Field,
	Form,
	FormActions,
	IconButton,
	Input,
	Select,
} from "@/shared/ui";

import styles from "./SettingsPage.module.css";

export function WarehouseRecords({
	w,
	execute,
	pending,
}: {
	w: Warehouse;
	execute: CommandExecutor;
	pending: boolean;
}) {
	const navigate = useNavigate();
	const mode = useWorkspaceMode();
	const [message, setMessage] = useState("");
	const [saving, setSaving] = useState(false);
	const [kind, setKind] = useState("products"),
		[id, setId] = useState("");
	const [remove, setRemove] = useState<"record" | "warehouse" | null>(null);
	const [stock, setStock] = useState<Stock>({
		id: "",
		product: "",
		quantity: 0,
		reserved: 0,
		cell: "",
		expires: "",
	});
	const options: Record<string, { value: string; label: string }[]> = {
		products: w.products.map((p) => ({ value: p.id, label: p.name })),
		categories: w.categories.map((c) => ({ value: c.id, label: c.name })),
		orders: w.orders.map((o) => ({ value: o.id, label: o.number })),
		stock: w.stock.map((s) => ({
			value: s.id,
			label: `${w.products.find((p) => p.id === s.product)?.name ?? s.product} · ${s.cell}`,
		})),
	};
	const busy = pending || saving;
	async function removeRecord() {
		setSaving(true);
		try {
			if (remove === "warehouse") {
				await execute("deleteWarehouse");
				void navigate(warehousePath(mode, "new"), { replace: true });
			} else if (kind === "products") await execute("deleteProduct", id);
			else if (kind === "categories") await execute("deleteCategory", id);
			else if (kind === "orders") await execute("deleteOrder", id);
			else await execute("deleteStock", id);
			setRemove(null);
			setId("");
			setMessage("Удалено");
		} catch (e) {
			setMessage(errorMessage(e));
		} finally {
			setSaving(false);
		}
	}
	async function saveStock() {
		setSaving(true);
		try {
			await execute("stock", { ...stock, id: stock.id || crypto.randomUUID() });
			setMessage("Остаток сохранён");
		} catch (e) {
			setMessage(errorMessage(e));
		} finally {
			setSaving(false);
		}
	}
	return (
		<>
			<div className={styles.settingsGrid}>
				<section className={styles.card}>
					<h3>Корректировка остатков</h3>
					<p>Создайте партию или исправьте существующую запись.</p>
					<Form
						onSubmit={(event) => {
							event.preventDefault();
							void saveStock();
						}}
					>
						<div className={styles.formGrid}>
							<Field label="Партия">
								<Select
									aria-label="Партия для редактирования"
									value={stock.id}
									onValueChange={(id) =>
										setStock(
											w.stock.find((item) => item.id === id) ?? {
												id: "",
												product: "",
												quantity: 0,
												reserved: 0,
												cell: "",
												expires: "",
											},
										)
									}
									options={[
										{ value: "", label: "Новая партия" },
										...(options.stock ?? []),
									]}
								/>
							</Field>
							<Field label="Товар">
								<Select
									aria-label="Товар партии"
									value={stock.product}
									onValueChange={(product) => setStock({ ...stock, product })}
									options={[
										{ value: "", label: "Выберите товар" },
										...(options.products ?? []),
									]}
								/>
							</Field>
							<Field label="Количество">
								<Input
									required
									type="number"
									min={stock.reserved ?? 0}
									step={1}
									value={stock.quantity}
									onChange={(event) =>
										setStock({ ...stock, quantity: Number(event.target.value) })
									}
								/>
							</Field>
							<Field label="Клетка">
								<Select
									aria-label="Клетка партии"
									value={stock.cell}
									onValueChange={(cell) => setStock({ ...stock, cell })}
									options={[
										{ value: "", label: "Выберите клетку" },
										...w.cells
											.filter((cell) => ["storage", "cold"].includes(cell.type))
											.map((cell) => ({
												value: `${cell.x},${cell.y}`,
												label: `${cell.x},${cell.y} · ${cell.zone?.name ?? "Хранение"}`,
											})),
									]}
								/>
							</Field>
							<Field label="Срок годности">
								<Input
									type="date"
									value={stock.expires}
									onChange={(event) =>
										setStock({ ...stock, expires: event.target.value })
									}
								/>
							</Field>
						</div>
						<FormActions>
							<Button
								type="submit"
								disabled={
									busy ||
									!stock.product ||
									!stock.cell ||
									!w.allowedActions?.includes("edit-inventory")
								}
							>
								Сохранить остаток
							</Button>
						</FormActions>
					</Form>
				</section>
				<section className={styles.card}>
					<h3>Удаление записей</h3>
					<p>
						Выберите тип и конкретную запись. Удаление потребует подтверждения.
					</p>
					<Field label="Тип записи">
						<Select
							aria-label="Тип записи"
							value={kind}
							onValueChange={(value) => {
								setKind(value);
								setId("");
							}}
							options={[
								{ value: "products", label: "Товары" },
								{ value: "categories", label: "Категории" },
								{ value: "orders", label: "Заказы" },
								{ value: "stock", label: "Остатки" },
							]}
						/>
					</Field>
					<Field label="Запись">
						<Select
							aria-label="Запись"
							value={id}
							onValueChange={setId}
							options={[
								{ value: "", label: "Выберите запись" },
								...(options[kind] ?? []),
							]}
						/>
					</Field>
					<FormActions>
						<IconButton
							label="Удалить запись"
							icon={<IconTrash size={16} />}
							variant="destructive"
							disabled={
								busy || !id || !w.allowedActions?.includes(`delete-${kind}`)
							}
							onClick={() => {
								setMessage("");
								setRemove("record");
							}}
						/>
					</FormActions>
					<details className={styles.dangerZone}>
						<summary>Удаление склада</summary>
						<p>Будет удалён «{w.name}» со всеми его данными.</p>
						<IconButton
							label="Удалить склад"
							icon={<IconTrash size={16} />}
							variant="destructive"
							disabled={busy || !w.allowedActions?.includes("delete")}
							onClick={() => {
								setMessage("");
								setRemove("warehouse");
							}}
						/>
					</details>
				</section>
			</div>
			<p role="status">{message}</p>
			<ConfirmDialog
				open={remove !== null}
				title={
					remove === "warehouse" ? `Удалить «${w.name}»?` : "Удалить запись?"
				}
				description="Это действие удалит выбранные данные."
				error={message}
				confirmLabel="Удалить"
				onConfirm={removeRecord}
				onCancel={() => setRemove(null)}
				pending={busy}
			/>
		</>
	);
}
