import { IconTrash } from "@tabler/icons-react";
import type { Warehouse } from "@/entities/warehouse";
import { Button, ErrorNotice, IconButton, Modal } from "@/shared/ui";
import type { useOrderDialogs } from "../model/useOrderDialogs";
import { OrderForm } from "./OrderForm";
import styles from "./OrdersPage.module.css";

export interface OrderCreationDialogProps {
	model: Pick<
		ReturnType<typeof useOrderDialogs>,
		| "choosing"
		| "closeChooser"
		| "savedForms"
		| "restoreForm"
		| "deleteForm"
		| "formError"
		| "newForm"
		| "creation"
		| "confirmClose"
		| "continueForm"
		| "saveForm"
		| "discardForm"
		| "closeCreation"
		| "submitting"
		| "createDraft"
		| "changeValues"
	> & {
		w: Warehouse;
		pending: boolean;
		page: "inbound" | "outbound";
	};
}

export function OrderCreationDialog({ model }: OrderCreationDialogProps) {
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
				<Button onClick={model.newForm}>Новая форма</Button>
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
			title={model.page === "inbound" ? "Новая поставка" : "Новый заказ"}
			onClose={model.closeCreation}
		>
			<OrderForm
				key={model.creation.id}
				kind={model.page}
				warehouse={model.w}
				pending={model.pending || model.submitting}
				onSave={model.createDraft}
				values={model.creation.values}
				onValuesChange={model.changeValues}
			/>
			<ErrorNotice message={model.formError} />
		</Modal>
	);
}
