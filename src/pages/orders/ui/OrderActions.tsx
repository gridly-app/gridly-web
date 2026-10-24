import { Button } from "@/shared/ui";
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

	return (
		<div className={`${localLayout.row} ${localLayout.wrap}`}>
			{onEdit && canEdit && (
				<Button variant="ghost" disabled={pending} onClick={onEdit}>
					Исправить черновик
				</Button>
			)}
			{visibleActions.map((action) => (
				<Button
					variant="ghost"
					key={action.id}
					disabled={pending}
					onClick={() => model.runOrderAction(action.id)}
				>
					{action.label}
				</Button>
			))}
			{canConfirm && (
				<Button
					variant="ghost"
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
