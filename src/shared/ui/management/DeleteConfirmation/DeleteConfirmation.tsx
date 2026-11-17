import { errorMessage } from "@/shared/lib";
import { Button } from "@/shared/ui/controls";
import { Feedback } from "@/shared/ui/feedback";
import { Modal } from "@/shared/ui/overlays";

import styles from "../ManagementLayout.module.css";

export function DeleteConfirmation({
	title,
	description,
	confirmLabel,
	isPending,
	error,
	onClose,
	onConfirm,
	onRefresh,
	refreshLabel,
}: {
	title: string;
	description: string;
	confirmLabel: string;
	isPending: boolean;
	error: Error | null;
	onClose: () => void;
	onConfirm: () => void;
	onRefresh?: (() => Promise<void>) | undefined;
	refreshLabel?: string;
}) {
	function handleClose() {
		if (!isPending) onClose();
	}

	return (
		<Modal title={title} onClose={handleClose}>
			<div className={styles.form}>
				<p>{description}</p>
				{error && <Feedback tone="error">{errorMessage(error)}</Feedback>}
				<div className={styles.actions}>
					<Button
						variant="secondary"
						disabled={isPending}
						onClick={handleClose}
					>
						Отмена
					</Button>
					{onRefresh ? (
						<Button disabled={isPending} onClick={onRefresh}>
							{refreshLabel}
						</Button>
					) : (
						<Button
							variant="destructive"
							disabled={isPending}
							onClick={onConfirm}
						>
							{confirmLabel}
						</Button>
					)}
				</div>
			</div>
		</Modal>
	);
}
