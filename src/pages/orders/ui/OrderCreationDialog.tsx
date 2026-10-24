import type { Warehouse } from "@/entities/warehouse";
import { Modal } from "@/shared/ui";
import type { useOrderDialogs } from "../model/useOrderDialogs";
import { OrderForm } from "./OrderForm";

export interface OrderCreationDialogProps {
	model: Pick<
		ReturnType<typeof useOrderDialogs>,
		"creating" | "setCreating" | "createDraft"
	> & { w: Warehouse; pending: boolean; page: "inbound" | "outbound" };
}

export function OrderCreationDialog({ model }: OrderCreationDialogProps) {
	const { creating, page, setCreating, w, pending, createDraft } = model;

	return (
		<>
			{creating && (
				<Modal
					title={page === "inbound" ? "Новая поставка" : "Новый заказ"}
					onClose={() => setCreating(false)}
				>
					<OrderForm
						kind={page}
						warehouse={w}
						pending={pending}
						onSave={createDraft}
					/>
				</Modal>
			)}
		</>
	);
}
