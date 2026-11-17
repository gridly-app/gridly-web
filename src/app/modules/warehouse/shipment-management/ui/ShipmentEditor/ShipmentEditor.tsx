import { type FormEvent, useState } from "react";

import {
	type Actual,
	type Milestone,
	type Plan,
	priorities,
} from "@/domain/shipment";
import { errorMessage } from "@/shared/lib";
import { Button, Textarea } from "@/shared/ui/controls";
import { Feedback } from "@/shared/ui/feedback";
import { Field, Select } from "@/shared/ui/forms";

import type { WorkingShipment } from "../../model/shipment.dto.ts";
import {
	editableMilestones,
	shipmentDraft,
	type ShipmentPlanRow,
} from "../../model/shipmentEditor";
import { ShipmentActualEditor } from "../ShipmentActualEditor/ShipmentActualEditor";
import { ShipmentMilestoneEditor } from "../ShipmentMilestoneEditor/ShipmentMilestoneEditor";
import { ShipmentPlanEditor } from "../ShipmentPlanEditor/ShipmentPlanEditor";

import styles from "../../shared.module.css";

const priorityOptions = [
	{ value: "none", label: "Не указан" },
	...Object.entries(priorities).map(([value, label]) => ({ value, label })),
];

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
	const [plan, setPlan] = useState<ShipmentPlanRow[]>(() =>
		shipment.plan.map((entry) => ({ clientId: crypto.randomUUID(), entry })),
	);
	const [actual, setActual] = useState(shipment.actual);
	const [milestones, setMilestones] = useState(() =>
		editableMilestones(shipment),
	);
	const [error, setError] = useState("");
	const firstItem = shipment.items[0];

	function handleSubmit(event: FormEvent) {
		event.preventDefault();
		setError("");

		try {
			const planEntries = plan.map(({ entry }) => entry);
			const body = shipmentDraft(
				shipment,
				priority,
				reason,
				planEntries,
				actual,
				milestones,
			);

			void save(body);
		} catch (error) {
			setError(errorMessage(error));
		}
	}

	function handlePriorityChange(value: string) {
		if (value === "none") setPriority(null);
		if (value === "low" || value === "normal" || value === "high")
			setPriority(value);
	}

	function handleEditPlan(clientId: string, patch: Partial<Plan>) {
		setPlan((rows) =>
			rows.map((row) =>
				row.clientId === clientId
					? { ...row, entry: { ...row.entry, ...patch } }
					: row,
			),
		);
	}

	function handleRemovePlan(clientId: string) {
		setPlan((rows) => rows.filter((row) => row.clientId !== clientId));
	}

	function handleAddPlan() {
		if (!firstItem) return;

		const row: ShipmentPlanRow = {
			clientId: crypto.randomUUID(),
			entry: {
				date: "",
				order_line_id: firstItem.order_line_id,
				quantity: 1,
				unit: firstItem.unit,
			},
		};

		setPlan((rows) => [...rows, row]);
	}

	function handleEditActual(id: string, patch: Partial<Actual>) {
		setActual((rows) =>
			rows.map((row) => (row.id === id ? { ...row, ...patch } : row)),
		);
	}

	function handleRemoveActual(id: string) {
		setActual((rows) => rows.filter((row) => row.id !== id));
	}

	function handleAddActual() {
		if (!firstItem) return;

		const row: Actual = {
			id: crypto.randomUUID(),
			order_line_id: firstItem.order_line_id,
			unit: firstItem.unit,
			quantity: 1,
			shipped_at: "",
			loaded_at: null,
			transport_type: "road",
			packaging: firstItem.packaging,
			vehicle_number: null,
			reference_number: null,
			comment: null,
		};

		setActual((rows) => [...rows, row]);
	}

	function handleEditMilestone(
		code: Milestone["code"],
		patch: Partial<Milestone>,
	) {
		setMilestones((rows) =>
			rows.map((row) => (row.code === code ? { ...row, ...patch } : row)),
		);
	}

	return (
		<form className={styles.panel} onSubmit={handleSubmit}>
			<h2>План, факт и этапы перевозки</h2>
			<fieldset disabled={busy} className={styles.fields}>
				<div>
					<span>Складской приоритет</span>
					<Select
						aria-label="Складской приоритет"
						value={priority ?? "none"}
						disabled={busy}
						onValueChange={handlePriorityChange}
						options={priorityOptions}
					/>
				</div>
				<Field label="Публичная причина задержки">
					<Textarea
						value={reason}
						onChange={(event) => setReason(event.target.value)}
					/>
				</Field>
				<ShipmentPlanEditor
					rows={plan}
					items={shipment.items}
					busy={busy}
					onEdit={handleEditPlan}
					onRemove={handleRemovePlan}
					onAdd={handleAddPlan}
				/>
				<ShipmentActualEditor
					rows={actual}
					items={shipment.items}
					busy={busy}
					onEdit={handleEditActual}
					onRemove={handleRemoveActual}
					onAdd={handleAddActual}
				/>
				<ShipmentMilestoneEditor
					rows={milestones}
					busy={busy}
					onEdit={handleEditMilestone}
				/>
				{error && <Feedback tone="error">{error}</Feedback>}
				<Button type="submit" disabled={busy}>
					Сохранить отгрузку
				</Button>
			</fieldset>
		</form>
	);
}
