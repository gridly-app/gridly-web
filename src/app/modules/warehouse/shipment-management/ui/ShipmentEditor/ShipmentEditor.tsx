import type { ChangeEvent } from "react";

import { priorities } from "@/domain/shipment";
import { Button, Textarea } from "@/shared/ui/controls";
import { Feedback } from "@/shared/ui/feedback";
import { Field, Select } from "@/shared/ui/forms";

import type { WorkingShipment } from "../../api/shipment.dto";
import type { ShipmentDraft } from "../../model/shipmentEditor";
import {
	noPriority,
	useShipmentEditorDraft,
} from "../../model/useShipmentEditorDraft";
import { ShipmentActualEditor } from "../ShipmentActualEditor/ShipmentActualEditor";
import { ShipmentMilestoneEditor } from "../ShipmentMilestoneEditor/ShipmentMilestoneEditor";
import { ShipmentPlanEditor } from "../ShipmentPlanEditor/ShipmentPlanEditor";

import styles from "../../shared.module.css";

const priorityOptions = [
	{ value: noPriority, label: "Не указан" },
	...Object.entries(priorities).map(([value, label]) => ({ value, label })),
];

export function ShipmentEditor({
	shipment,
	isBusy,
	onSave,
}: {
	shipment: WorkingShipment;
	isBusy: boolean;
	onSave: (body: ShipmentDraft) => Promise<void>;
}) {
	const draft = useShipmentEditorDraft(shipment, onSave);
	const hasNewerVersion = shipment.revision !== draft.source.revision;

	function handleReasonChange(event: ChangeEvent<HTMLTextAreaElement>) {
		draft.handleReasonChange(event.target.value);
	}

	return (
		<form className={styles.panel} onSubmit={draft.handleSubmit}>
			<h2>План, факт и этапы перевозки</h2>
			{hasNewerVersion && (
				<Feedback tone="warning">
					<p>
						На сервере версия {shipment.revision}, в вашем черновике{" "}
						{draft.source.revision}. Правки сохранены.
					</p>
					<p>
						На сервере строк плана {shipment.plan.length}, строк факта{" "}
						{shipment.actual.length}. Причина задержки:{" "}
						{shipment.order.status_reason || "Не указана"}.
					</p>
					<Button
						type="button"
						variant="secondary"
						disabled={isBusy}
						onClick={draft.handleReplaceDraft}
					>
						Заменить черновик текущими данными
					</Button>
				</Feedback>
			)}
			<fieldset disabled={isBusy} className={styles.fields}>
				<div>
					<span>Складской приоритет</span>
					<Select
						aria-label="Складской приоритет"
						value={draft.priority ?? noPriority}
						disabled={isBusy}
						onValueChange={draft.handlePriorityChange}
						options={priorityOptions}
					/>
				</div>
				<Field label="Публичная причина задержки">
					<Textarea value={draft.reason} onChange={handleReasonChange} />
				</Field>
				<ShipmentPlanEditor
					rows={draft.plan}
					items={shipment.items}
					isBusy={isBusy}
					onEdit={draft.handleEditPlan}
					onRemove={draft.handleRemovePlan}
					onAdd={draft.handleAddPlan}
				/>
				<ShipmentActualEditor
					rows={draft.actual}
					items={shipment.items}
					isBusy={isBusy}
					onEdit={draft.handleEditActual}
					onRemove={draft.handleRemoveActual}
					onAdd={draft.handleAddActual}
				/>
				<ShipmentMilestoneEditor
					rows={draft.milestones}
					isBusy={isBusy}
					onEdit={draft.handleEditMilestone}
				/>
				{draft.error && <Feedback tone="error">{draft.error}</Feedback>}
				<Button type="submit" disabled={isBusy}>
					Сохранить отгрузку
				</Button>
			</fieldset>
		</form>
	);
}
