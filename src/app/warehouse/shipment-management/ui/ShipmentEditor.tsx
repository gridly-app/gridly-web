import { type FormEvent, useState } from "react";
import {
	type Actual,
	formatUnit,
	type Milestone,
	priorities,
	stages,
	transports,
} from "@/domain/shipment";
import { errorMessage } from "@/shared/lib";
import { Button, Input, Textarea } from "@/shared/ui/controls";
import { Feedback } from "@/shared/ui/feedback";
import { Field, Select } from "@/shared/ui/forms";
import type { WorkingShipment } from "../model/shipment.dto";
import {
	dateInput,
	editableMilestones,
	shipmentDraft,
	utcInput,
} from "../model/shipmentEditor";
import styles from "./ShipmentManagement.module.css";

export function ShipmentEditor({
	shipment,
	busy,
	save,
}: {
	shipment: WorkingShipment;
	busy: boolean;
	save: (body: ReturnType<typeof shipmentDraft>) => Promise<void>;
}) {
	const [priority, setPriority] = useState(shipment.warehouse.priority);
	const [reason, setReason] = useState(shipment.order.status_reason ?? "");
	const [plan, setPlan] = useState(shipment.plan);
	const [actual, setActual] = useState(shipment.actual);
	const [milestones, setMilestones] = useState(() =>
		editableMilestones(shipment),
	);
	const [error, setError] = useState("");
	const [planKeys, setPlanKeys] = useState(() =>
		shipment.plan.map(() => crypto.randomUUID()),
	);
	const first = shipment.items[0];
	function submit(event: FormEvent) {
		event.preventDefault();
		setError("");
		try {
			void save(
				shipmentDraft(shipment, priority, reason, plan, actual, milestones),
			);
		} catch (error) {
			setError(errorMessage(error));
		}
	}
	return (
		<form className={styles.panel} onSubmit={submit}>
			<h2>План, факт и этапы перевозки</h2>
			<fieldset disabled={busy} className={styles.fields}>
				<div>
					<span>Складской приоритет</span>
					<Select
						aria-label="Складской приоритет"
						value={priority ?? "none"}
						disabled={busy}
						onValueChange={(value) => {
							if (value === "none") setPriority(null);
							if (value === "low" || value === "normal" || value === "high")
								setPriority(value);
						}}
						options={[
							{ value: "none", label: "Не указан" },
							...Object.entries(priorities).map(([value, label]) => ({
								value,
								label,
							})),
						]}
					/>
				</div>
				<Field label="Публичная причина задержки">
					<Textarea
						value={reason}
						onChange={(event) => setReason(event.target.value)}
					/>
				</Field>
				<h3>План по датам</h3>
				{plan.map((row, index) => (
					<fieldset className={styles.row} key={planKeys[index]}>
						<legend>Плановая строка {index + 1}</legend>
						<ItemPicker
							busy={busy}
							shipment={shipment}
							value={row.order_line_id}
							onChange={(item) =>
								setPlan(
									update(plan, index, {
										order_line_id: item.order_line_id,
										unit: item.unit,
									}),
								)
							}
						/>
						<Field label="Дата">
							<Input
								required
								type="date"
								value={row.date}
								onChange={(event) =>
									setPlan(update(plan, index, { date: event.target.value }))
								}
							/>
						</Field>
						<Quantity
							unit={row.unit}
							value={row.quantity}
							change={(quantity) => setPlan(update(plan, index, { quantity }))}
						/>
						<Button
							type="button"
							variant="ghost"
							onClick={() => {
								setPlan(plan.filter((_, at) => at !== index));
								setPlanKeys(planKeys.filter((_, at) => at !== index));
							}}
						>
							Удалить строку плана
						</Button>
					</fieldset>
				))}
				<Button
					type="button"
					variant="secondary"
					disabled={!first}
					onClick={() => {
						if (!first) return;
						setPlan([
							...plan,
							{
								date: "",
								order_line_id: first.order_line_id,
								quantity: 1,
								unit: first.unit,
							},
						]);
						setPlanKeys([...planKeys, crypto.randomUUID()]);
					}}
				>
					Добавить план
				</Button>
				<h3>Факт отгрузки</h3>
				<p>Время в полях ниже указывается в UTC.</p>
				{actual.map((row, index) => (
					<ActualFields
						busy={busy}
						key={row.id}
						index={index}
						shipment={shipment}
						row={row}
						edit={(patch) => setActual(update(actual, index, patch))}
						remove={() =>
							setActual(actual.filter((entry) => entry.id !== row.id))
						}
					/>
				))}
				<Button
					type="button"
					variant="secondary"
					disabled={!first}
					onClick={() => {
						if (!first) return;
						setActual([
							...actual,
							{
								id: crypto.randomUUID(),
								order_line_id: first.order_line_id,
								unit: first.unit,
								quantity: 1,
								shipped_at: "",
								loaded_at: null,
								transport_type: "road",
								packaging: first.packaging,
								vehicle_number: null,
								reference_number: null,
								comment: null,
							},
						]);
					}}
				>
					Добавить факт
				</Button>
				<h3>Транспортные этапы</h3>
				{milestones.map((row, index) => {
					const edit = (patch: Partial<Milestone>) =>
						setMilestones(update(milestones, index, patch));
					return (
						<fieldset key={row.code} className={styles.row}>
							<legend>{stages[row.code]}</legend>
							<div>
								<span>Состояние</span>
								<Select
									aria-label="Состояние"
									value={row.state}
									disabled={busy}
									onValueChange={(state) => {
										if (state === "pending") edit({ state, occurred_at: null });
										if (state === "current" || state === "completed")
											edit({ state });
									}}
									options={[
										{ value: "pending", label: "Ожидается" },
										{ value: "current", label: "Текущий" },
										{ value: "completed", label: "Завершён" },
									]}
								/>
							</div>
							<DateTime
								label="Факт (UTC)"
								value={row.occurred_at}
								change={(occurred_at) => edit({ occurred_at })}
								disabled={row.state === "pending"}
								required={row.state === "completed"}
							/>
							<DateTime
								label="План (UTC)"
								value={row.planned_at}
								change={(planned_at) => edit({ planned_at })}
							/>
							<Field label="Примечание">
								<Input
									value={row.note ?? ""}
									onChange={(event) =>
										edit({ note: event.target.value || null })
									}
								/>
							</Field>
						</fieldset>
					);
				})}
				{error && <Feedback tone="error">{error}</Feedback>}
				<Button type="submit" disabled={busy}>
					Сохранить отгрузку
				</Button>
			</fieldset>
		</form>
	);
}

function update<T>(rows: T[], index: number, patch: Partial<T>) {
	return rows.map((row, at) => (at === index ? { ...row, ...patch } : row));
}

function ItemPicker({
	busy,
	shipment,
	value,
	onChange,
}: {
	shipment: WorkingShipment;
	busy: boolean;
	value: string;
	onChange: (item: WorkingShipment["items"][number]) => void;
}) {
	return (
		<div>
			<span>Номенклатура</span>
			<Select
				aria-label="Номенклатура"
				value={value}
				disabled={busy}
				onValueChange={(id) => {
					const item = shipment.items.find(
						({ order_line_id }) => order_line_id === id,
					);
					if (item) onChange(item);
				}}
				options={shipment.items.map((item) => ({
					value: item.order_line_id,
					label: `${item.sku} · ${item.name}`,
				}))}
				searchable
			/>
		</div>
	);
}
function Quantity({
	unit,
	value,
	change,
}: {
	unit: string;
	value: number;
	change: (quantity: number) => void;
}) {
	return (
		<Field label={`Количество (${formatUnit(unit)})`}>
			<Input
				required
				type="number"
				step="any"
				min="0"
				value={Number.isNaN(value) ? "" : value}
				onChange={(event) => change(event.target.valueAsNumber)}
			/>
		</Field>
	);
}
function DateTime({
	label,
	value,
	change,
	required,
	disabled,
}: {
	label: string;
	value: string | null;
	change: (value: string | null) => void;
	required?: boolean;
	disabled?: boolean;
}) {
	return (
		<Field label={label}>
			<Input
				type="datetime-local"
				step="1"
				required={required}
				disabled={disabled}
				value={dateInput(value)}
				onChange={(event) => change(utcInput(event.target.value))}
			/>
		</Field>
	);
}
function ActualFields({
	busy,
	index,
	shipment,
	row,
	edit,
	remove,
}: {
	index: number;
	busy: boolean;
	shipment: WorkingShipment;
	row: Actual;
	edit: (patch: Partial<Actual>) => void;
	remove: () => void;
}) {
	const fields = [
		["packaging", "Упаковка"],
		["vehicle_number", "Номер вагона / автомобиля"],
		["reference_number", "Номер рейса / накладной"],
		["comment", "Публичный комментарий"],
	] as const;
	return (
		<fieldset className={styles.row}>
			<legend>Фактическая строка {index + 1}</legend>
			<ItemPicker
				busy={busy}
				shipment={shipment}
				value={row.order_line_id}
				onChange={(item) =>
					edit({
						order_line_id: item.order_line_id,
						unit: item.unit,
						packaging: item.packaging,
					})
				}
			/>
			<Quantity
				unit={row.unit}
				value={row.quantity}
				change={(quantity) => edit({ quantity })}
			/>
			<DateTime
				label="Отгружено (UTC)"
				required
				value={row.shipped_at}
				change={(value) => edit({ shipped_at: value ?? "" })}
			/>
			<DateTime
				label="Погружено (UTC)"
				value={row.loaded_at}
				change={(loaded_at) => edit({ loaded_at })}
			/>
			<div>
				<span>Тип перевозки</span>
				<Select
					aria-label="Тип перевозки"
					value={row.transport_type}
					disabled={busy}
					onValueChange={(value) => {
						if (value === "road" || value === "rail")
							edit({ transport_type: value });
					}}
					options={Object.entries(transports).map(([value, label]) => ({
						value,
						label,
					}))}
				/>
			</div>
			{fields.map(([key, label]) => (
				<Field key={key} label={label}>
					<Input
						value={row[key] ?? ""}
						onChange={(event) => edit({ [key]: event.target.value || null })}
					/>
				</Field>
			))}
			<Button type="button" variant="ghost" onClick={remove}>
				Удалить строку факта
			</Button>
		</fieldset>
	);
}
