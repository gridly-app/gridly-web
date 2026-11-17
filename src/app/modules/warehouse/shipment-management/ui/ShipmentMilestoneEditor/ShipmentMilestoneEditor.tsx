import { type Milestone, stages } from "@/domain/shipment";
import { Input } from "@/shared/ui/controls";
import { Field, Select } from "@/shared/ui/forms";

import { DateTime } from "../ShipmentEditorFields/ShipmentEditorFields";

import styles from "../../shared.module.css";

export function ShipmentMilestoneEditor({
	rows,
	busy,
	onEdit,
}: {
	rows: Milestone[];
	busy: boolean;
	onEdit: (code: Milestone["code"], patch: Partial<Milestone>) => void;
}) {
	return (
		<>
			<h3>Транспортные этапы</h3>
			{rows.map((row) => {
				const edit = (patch: Partial<Milestone>) => onEdit(row.code, patch);
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
								onChange={(event) => edit({ note: event.target.value || null })}
							/>
						</Field>
					</fieldset>
				);
			})}
		</>
	);
}
