import { IconTrash } from "@tabler/icons-react";
import type { Warehouse } from "@/entities/warehouse";
import { Button, IconButton } from "@/shared/ui/controls";
import { ErrorNotice } from "@/shared/ui/feedback";
import { Modal } from "@/shared/ui/overlays";
import type { useOrderCreation } from "../../model/useOrderCreation";
import styles from "./OrderCreationDialog.module.css";
import { OrderForm } from "./OrderForm";

export interface OrderCreationDialogProps {
	model: Omit<ReturnType<typeof useOrderCreation>, "openCreation">;
	warehouse: Warehouse;
	pending: boolean;
	kind: "inbound" | "outbound";
}

export function OrderCreationDialog({
	model,
	warehouse,
	pending,
	kind,
}: OrderCreationDialogProps) {
	if (model.choosing)
		return (
			<Modal title="Сохранённые формы" onClose={model.closeChooser}>
				<p>Продолжите заполнение формы или создайте новую.</p>
				<div className={styles.savedForms}>
					{model.savedForms.map((form) => (
						<div key={form.id} className={styles.savedForm}>
							<Button
								variant="secondary"
								onClick={() => model.restoreForm(form)}
							>
								Продолжить форму: {form.values.party || "Без контрагента"} ·{" "}
								{new Date(form.updatedAt).toLocaleString("ru")}
							</Button>
							<IconButton
								icon={<IconTrash size={16} />}
								variant="destructive"
								label={`Удалить сохранённую форму ${form.values.party || "Без контрагента"}`}
								onClick={() => model.deleteForm(form.id)}
							/>
						</div>
					))}
				</div>
				<ErrorNotice message={model.formError} />
				<Button onClick={model.newForm}>+ Форма</Button>
			</Modal>
		);
	if (!model.creation) return null;
	if (model.confirmClose)
		return (
			<Modal
				title="Сохранить незавершённую форму?"
				onClose={model.continueForm}
			>
				<p>
					Сохранённую форму можно будет заполнить позже. Заказ на сервере пока
					не создаётся.
				</p>
				<ErrorNotice message={model.formError} />
				<div className={styles.savedForms}>
					<Button onClick={model.saveForm}>Сохранить форму</Button>
					<Button variant="destructive" onClick={model.discardForm}>
						Удалить изменения
					</Button>
					<Button variant="ghost" onClick={model.continueForm}>
						Продолжить заполнение
					</Button>
				</div>
			</Modal>
		);
	return (
		<Modal
			title={kind === "inbound" ? "Поставка" : "Заказ"}
			onClose={model.closeCreation}
		>
			<OrderForm
				key={model.creation.id}
				kind={kind}
				warehouse={warehouse}
				pending={pending || model.submitting}
				onSave={model.createDraft}
				values={model.creation.values}
				onValuesChange={model.changeValues}
			/>
			<ErrorNotice message={model.formError} />
		</Modal>
	);
}
