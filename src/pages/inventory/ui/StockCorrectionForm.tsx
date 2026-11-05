import { useState } from "react";
import {
	cellKey,
	type Stock,
	stockZoneId,
	type Warehouse,
} from "@/entities/warehouse";
import { Field, FormGrid, FormShell, Input, Select } from "@/shared/ui";
import { correctionZones, stockDestination } from "../model/stockCorrection";

export function StockCorrectionForm({
	stock,
	warehouse,
	pending,
	onSave,
}: {
	stock: Stock | null;
	warehouse: Warehouse;
	pending: boolean;
	onSave: (stock: Stock) => Promise<void>;
}) {
	const [id] = useState(() => stock?.id ?? crypto.randomUUID());
	const [product, setProduct] = useState(stock?.product ?? "");
	const [zone, setZone] = useState(() => {
		const cell = warehouse.cells.find((item) => cellKey(item) === stock?.cell);
		return cell ? stockZoneId(cell) : "";
	});
	const zones = correctionZones(warehouse, product);
	const destination = zones.find((item) => item.value === zone);

	return (
		<FormShell
			pending={pending}
			submitLabel="Сохранить остаток"
			onSubmit={async (data) => {
				if (!product || !destination)
					throw new Error("Выберите товар и зону хранения.");
				const quantity = Number(data.get("quantity"));
				const next = {
					...stock,
					id,
					product,
					quantity,
					expires: String(data.get("expires") ?? ""),
					cell: stock?.cell ?? "",
				};
				const cell = stockDestination(warehouse, destination.cells, next);
				if (!cell)
					throw new Error(
						(stock?.reserved ?? 0) > 0
							? "В текущем месте недостаточно объёма. Партию в резерве переместить нельзя."
							: "В выбранной зоне недостаточно места для партии.",
					);
				await onSave({ ...next, cell });
			}}
		>
			<Field label="Товар">
				<Select
					aria-label="Товар партии"
					value={product}
					disabled={(stock?.reserved ?? 0) > 0}
					onValueChange={(value) => {
						setProduct(value);
						setZone("");
					}}
					options={[
						{ value: "", label: "Выберите товар" },
						...warehouse.products
							.filter((item) => !item.archived || item.id === stock?.product)
							.map((item) => ({ value: item.id, label: item.name })),
					]}
				/>
			</Field>
			<Field label="Зона хранения">
				<Select
					aria-label="Зона партии"
					disabled={(stock?.reserved ?? 0) > 0}
					value={destination?.value ?? ""}
					onValueChange={setZone}
					options={[{ value: "", label: "Выберите зону" }, ...zones]}
				/>
			</Field>
			<FormGrid>
				<Field label="Количество">
					<Input
						type="number"
						name="quantity"
						required
						min={stock ? (stock.reserved ?? 0) : 1}
						step={1}
						defaultValue={stock?.quantity ?? 1}
					/>
				</Field>
				<Field label="Срок годности">
					<Input type="date" name="expires" defaultValue={stock?.expires} />
				</Field>
			</FormGrid>
		</FormShell>
	);
}
