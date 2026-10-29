import { Dialog } from "@base-ui/react/dialog";
import { type ReactNode, useState } from "react";
import { Button } from "../controls/Button";
import modalStyles from "./Modal.module.css";

export interface ModalProps {
	title: string;
	children: ReactNode;
	onClose: () => void;
	finalFocus?: Dialog.Popup.Props["finalFocus"] | undefined;
}

export function Modal({ title, children, onClose, finalFocus }: ModalProps) {
	const [opener] = useState(() =>
		document.activeElement instanceof HTMLElement
			? document.activeElement
			: null,
	);
	function handleOpenChange(open: boolean) {
		if (!open) {
			onClose();
		}
	}

	return (
		<Dialog.Root open onOpenChange={handleOpenChange}>
			<Dialog.Portal>
				<Dialog.Backdrop className={modalStyles.backdrop} />
				<Dialog.Popup
					className={modalStyles.modal}
					finalFocus={finalFocus ?? (() => opener)}
				>
					<div className={modalStyles.modalHead}>
						<Dialog.Title>{title}</Dialog.Title>
						<Dialog.Close
							render={
								<Button
									variant="ghost"
									tooltip={false}
									size="icon"
									className={modalStyles.close}
								/>
							}
							aria-label="Закрыть"
						>
							×
						</Dialog.Close>
					</div>
					{children}
				</Dialog.Popup>
			</Dialog.Portal>
		</Dialog.Root>
	);
}
