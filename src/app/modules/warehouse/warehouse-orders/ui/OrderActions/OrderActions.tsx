import { IconEdit } from "@tabler/icons-react";

import { Button, IconButton } from "@/shared/ui/controls";

import type { useOrderDetail } from "../../model/useOrderDetail";

import styles from "./OrderActions.module.css";

const destructiveActions = ["cancel", "abort", "write-off-expired"];

export function OrderActions({
	model,
}: {
	model: Pick<
		ReturnType<typeof useOrderDetail>,
		| "onEdit"
		| "canEdit"
		| "pending"
		| "visibleActions"
		| "canConfirm"
		| "confirmLabel"
		| "confirmOrder"
		| "runOrderAction"
	>;
}) {
	const { onEdit, canEdit, pending, visibleActions, canConfirm, confirmOrder } =
		model;
	const canEditDraft = Boolean(onEdit) && canEdit;

	if (!canEditDraft && !visibleActions.length && !canConfirm) return null;

	function handleConfirm() {
		void confirmOrder();
	}

	return (
		<div className={styles.actions}>
			{canEditDraft && (
				<IconButton
					label="Изменить черновик"
					icon={<IconEdit aria-hidden="true" />}
					variant="secondary"
					disabled={pending}
					onClick={onEdit}
				/>
			)}
			{visibleActions.map((action) => (
				<Button
					variant={
						destructiveActions.includes(action.id) ? "destructive" : "default"
					}
					key={action.id}
					disabled={pending}
					onClick={() => model.runOrderAction(action.id)}
				>
					{action.label}
				</Button>
			))}
			{canConfirm && (
				<Button variant="default" disabled={pending} onClick={handleConfirm}>
					{model.confirmLabel}
				</Button>
			)}
		</div>
	);
}
