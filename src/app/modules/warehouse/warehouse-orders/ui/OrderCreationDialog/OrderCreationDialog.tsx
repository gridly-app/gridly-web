import { IconTrash } from "@tabler/icons-react";

import { Button, IconButton } from "@/shared/ui/controls";
import { ErrorNotice } from "@/shared/ui/feedback";
import { Modal } from "@/shared/ui/overlays";

import type { useOrderCreation } from "../../model/useOrderCreation";
import type { OrderScreenWarehouse } from "../../model/warehouseResources";
import { OrderForm } from "../OrderForm/OrderForm";

import styles from "./OrderCreationDialog.module.css";

type CreationModel = Omit<ReturnType<typeof useOrderCreation>, "openCreation">;

export function OrderCreationDialog({
	model,
	warehouse,
	isPending,
	kind,
}: {
	model: CreationModel;
	warehouse: OrderScreenWarehouse;
	isPending: boolean;
	kind: "inbound" | "outbound";
}) {
	if (model.choosing) return <SavedFormsDialog model={model} />;
	if (!model.creation) return null;

	if (model.confirmClose) {
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
	}

	return (
		<Modal
			title={kind === "inbound" ? "Поставка" : "Заказ"}
			onClose={model.closeCreation}
		>
			<OrderForm
				key={model.creation.id}
				kind={kind}
				warehouse={warehouse}
				pending={isPending || model.submitting}
				onSave={model.createDraft}
				values={model.creation.values}
				onValuesChange={model.changeValues}
			/>
			<ErrorNotice message={model.formError} />
		</Modal>
	);
}

function SavedFormsDialog({ model }: { model: CreationModel }) {
	return (
		<Modal title="Сохранённые формы" onClose={model.closeChooser}>
			<p>Продолжите заполнение формы или создайте новую.</p>
			<div className={styles.savedForms}>
				{model.savedForms.map((form) => {
					const party = form.values.party || "Без контрагента";

					return (
						<div key={form.id} className={styles.savedForm}>
							<Button
								variant="secondary"
								onClick={() => model.restoreForm(form)}
							>
								Продолжить форму: {party} ·{" "}
								{new Date(form.updatedAt).toLocaleString("ru")}
							</Button>
							<IconButton
								icon={<IconTrash size={16} />}
								variant="destructive"
								label={`Удалить сохранённую форму ${party}`}
								onClick={() => model.deleteForm(form.id)}
							/>
						</div>
					);
				})}
			</div>
			<ErrorNotice message={model.formError} />
			<Button onClick={model.newForm}>+ Форма</Button>
		</Modal>
	);
}
