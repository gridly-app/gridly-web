import { Button } from "../controls/Button";
import { StableLabel } from "../controls/StableLabel";
import { ErrorNotice } from "../feedback/ErrorNotice";
import {
	AlertDialog,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogPopup,
	AlertDialogTitle,
} from "../spaceui/alert-dialog";
export interface ConfirmDialogProps {
	open: boolean;
	title: string;
	description: string;
	confirmLabel: string;
	pending?: boolean | undefined;
	error?: string | undefined;
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
	return (
		<AlertDialog
			open={open}
			onOpenChange={(next) => {
				if (!next && !pending) onCancel();
			}}
		>
			<AlertDialogPopup>
				<AlertDialogHeader>
					<AlertDialogTitle>{title}</AlertDialogTitle>
					<AlertDialogDescription>{description}</AlertDialogDescription>
					<ErrorNotice message={error} />
				</AlertDialogHeader>
				<AlertDialogFooter>
					<Button variant="ghost" disabled={pending} onClick={onCancel}>
						Отмена
					</Button>
					<Button
						variant="destructive"
						loading={!!pending}
						onClick={() => {
							void onConfirm();
						}}
					>
						<StableLabel variants={[confirmLabel, "Выполняем…"]}>
							{pending ? "Выполняем…" : confirmLabel}
						</StableLabel>
					</Button>
				</AlertDialogFooter>
			</AlertDialogPopup>
		</AlertDialog>
	);
}
