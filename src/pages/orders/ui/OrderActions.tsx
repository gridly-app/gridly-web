import { IconPencil } from "@tabler/icons-react";
import { Button, IconButton } from "@/shared/ui";
import type { useOrderDetail } from "../model/useOrderDetail";
import localLayout from "./Layout.module.css";

export interface OrderActionsProps {
	model: Pick<
		ReturnType<typeof useOrderDetail>,
		| "onEdit"
		| "canEdit"
		| "pending"
		| "visibleActions"
		| "canConfirm"
		| "confirmOrder"
		| "runOrderAction"
	>;
}

export function OrderActions({ model }: OrderActionsProps) {
	const { onEdit, canEdit, pending, visibleActions, canConfirm, confirmOrder } =
		model;

	if (!(onEdit && canEdit) && !visibleActions.length && !canConfirm)
		return null;

	return (
		<div className={`${localLayout.row} ${localLayout.wrap}`}>
			{onEdit && canEdit && (
				<IconButton
					label="Изменить черновик"
					icon={<IconPencil size={16} />}
					variant="secondary"
					disabled={pending}
					onClick={onEdit}
				/>
			)}
			{visibleActions.map((action) => (
				<Button
					variant={
						["cancel", "abort", "write-off-expired"].includes(action.id)
							? "destructive"
							: "default"
					}
					key={action.id}
					disabled={pending}
					onClick={() => model.runOrderAction(action.id)}
				>
					{action.label}
				</Button>
			))}
			{canConfirm && (
				<Button
					variant="default"
					disabled={pending}
					onClick={() => {
						void confirmOrder();
					}}
				>
					Подтвердить этап
				</Button>
			)}
		</div>
	);
}
