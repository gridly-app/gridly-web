import { priorities } from "@/domain/shipment";
import { Button, Textarea } from "@/shared/ui/controls";
import { Feedback } from "@/shared/ui/feedback";
import { Field, Select } from "@/shared/ui/forms";

import type { WorkingShipment } from "../../api/shipment.dto.ts";
import type { shipmentDraft } from "../../model/shipmentEditor";
import { useShipmentEditorDraft } from "../../model/useShipmentEditorDraft";
import { ShipmentActualEditor } from "../ShipmentActualEditor/ShipmentActualEditor";
import { ShipmentMilestoneEditor } from "../ShipmentMilestoneEditor/ShipmentMilestoneEditor";
import { ShipmentPlanEditor } from "../ShipmentPlanEditor/ShipmentPlanEditor";

import styles from "../../shared.module.css";

const priorityEntries = Object.entries(priorities);
const priorityOptions = [
	{ value: "none", label: "Не указан" },
	...priorityEntries.map(([value, label]) => ({ value, label })),
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
	const {
		source,
		priority,
		reason,
		plan,
		actual,
		milestones,
		error,
		setReason,
		handleSubmit,
		handlePriorityChange,
		handleReplaceDraft,
		handleEditPlan,
		handleRemovePlan,
		handleAddPlan,
		handleEditActual,
		handleRemoveActual,
		handleAddActual,
		handleEditMilestone,
	} = useShipmentEditorDraft(shipment, save);

	return (
		<form className={styles.panel} onSubmit={handleSubmit}>
			<h2>План, факт и этапы перевозки</h2>
			{shipment.revision !== source.revision && (
				<Feedback tone="warning">
					<p>
						На сервере версия {shipment.revision}, в вашем черновике{" "}
						{source.revision}. Правки сохранены.
					</p>
					<p>
						На сервере строк плана {shipment.plan.length}, строк факта{" "}
						{shipment.actual.length}. Причина задержки:{" "}
						{shipment.order.status_reason || "Не указана"}.
					</p>
					<Button
						type="button"
						variant="secondary"
						disabled={busy}
						onClick={handleReplaceDraft}
					>
						Заменить черновик текущими данными
					</Button>
				</Feedback>
			)}
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
