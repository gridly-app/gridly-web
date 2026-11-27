import type { ChangeEvent } from "react";

import { type Milestone, stages } from "@/domain/shipment";
import { Input } from "@/shared/ui/controls";
import { Field, Select } from "@/shared/ui/forms";

import { DateTime } from "../ShipmentEditorFields/ShipmentEditorFields";

import styles from "../../shared.module.css";

const stateOptions = [
	{ value: "pending", label: "Ожидается" },
	{ value: "current", label: "Текущий" },
	{ value: "completed", label: "Завершён" },
];

export function ShipmentMilestoneEditor({
	rows,
	isBusy,
	onEdit,
}: {
	rows: Milestone[];
	isBusy: boolean;
	onEdit: (code: Milestone["code"], patch: Partial<Milestone>) => void;
}) {
	return (
		<>
			<h3>Транспортные этапы</h3>
			{rows.map((row) => (
				<MilestoneFields
					key={row.code}
					row={row}
					isBusy={isBusy}
					onEdit={onEdit}
				/>
			))}
		</>
	);
}

function MilestoneFields({
	row,
	isBusy,
	onEdit,
}: {
	row: Milestone;
	isBusy: boolean;
	onEdit: (code: Milestone["code"], patch: Partial<Milestone>) => void;
}) {
	function edit(patch: Partial<Milestone>) {
		onEdit(row.code, patch);
	}

	function handleStateChange(state: string) {
		if (state === "pending") edit({ state, occurred_at: null });
		if (state === "current" || state === "completed") edit({ state });
	}

	function handleOccurredAtChange(occurredAt: string | null) {
		edit({ occurred_at: occurredAt });
	}

	function handlePlannedAtChange(plannedAt: string | null) {
		edit({ planned_at: plannedAt });
	}

	function handleNoteChange(event: ChangeEvent<HTMLInputElement>) {
		edit({ note: event.target.value || null });
	}

	return (
		<fieldset className={styles.row}>
			<legend>{stages[row.code]}</legend>
			<div>
				<span>Состояние</span>
				<Select
					aria-label="Состояние"
					value={row.state}
					disabled={isBusy}
					onValueChange={handleStateChange}
					options={stateOptions}
				/>
			</div>
			<DateTime
				label="Факт (UTC)"
				value={row.occurred_at}
				isDisabled={row.state === "pending"}
				isRequired={row.state === "completed"}
				onChange={handleOccurredAtChange}
			/>
			<DateTime
				label="План (UTC)"
				value={row.planned_at}
				onChange={handlePlannedAtChange}
			/>
			<Field label="Примечание">
				<Input value={row.note ?? ""} onChange={handleNoteChange} />
			</Field>
		</fieldset>
	);
}
