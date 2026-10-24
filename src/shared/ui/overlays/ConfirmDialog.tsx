import { AlertDialog } from "@base-ui/react/alert-dialog";
import { IconRotate } from "@tabler/icons-react";
import { Button } from "../controls/Button";
import { ErrorNotice } from "../feedback/ErrorNotice";
import confirmationStyles from "./ConfirmDialog.module.css";

export interface ConfirmDialogProps {
	open: boolean;
	title: string;
	description: string;
	confirmLabel: string;
	pending?: boolean;
	error?: string;
	onConfirm: () => void | Promise<void>;
	onCancel: () => void;
}

export function ConfirmDialog({
	open,
	title,
	description,
	confirmLabel,
	pending,
	error,
	onConfirm,
	onCancel,
}: ConfirmDialogProps) {
	function handleOpenChange(next: boolean) {
		if (!next && !pending) {
			onCancel();
		}
	}

	return (
		<AlertDialog.Root open={open} onOpenChange={handleOpenChange}>
			<AlertDialog.Portal>
				<AlertDialog.Backdrop
					className={confirmationStyles["confirmation-backdrop"]}
				/>
				<AlertDialog.Viewport
					className={confirmationStyles["confirmation-viewport"]}
				>
					<AlertDialog.Popup
						className={confirmationStyles["confirmation-popup"]}
					>
						<div className={confirmationStyles["confirmation-header"]}>
							<AlertDialog.Title>{title}</AlertDialog.Title>
							<AlertDialog.Description>{description}</AlertDialog.Description>
							<ErrorNotice message={error} />
						</div>
						<div className={confirmationStyles["confirmation-footer"]}>
							<Button variant="ghost" disabled={pending} onClick={onCancel}>
								Продолжить редактирование
							</Button>
							<Button
								disabled={pending}
								onClick={() => {
									void onConfirm();
								}}
							>
								{pending && (
									<IconRotate
										size={16}
										className={confirmationStyles["reset-spinning"]}
									/>
								)}
								{pending ? "Сбрасываем…" : confirmLabel}
							</Button>
						</div>
					</AlertDialog.Popup>
				</AlertDialog.Viewport>
			</AlertDialog.Portal>
		</AlertDialog.Root>
	);
}
