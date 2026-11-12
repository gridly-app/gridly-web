import { type ComponentProps, type ReactNode, useState } from "react";
import { Button } from "../controls/Button";
import {
	Dialog,
	DialogHeader,
	DialogPanel,
	DialogPopup,
	DialogTitle,
} from "../spaceui/dialog";
import styles from "./Modal.module.css";
export interface ModalProps {
	title: string;
	wide?: boolean;
	children: ReactNode;
	onClose: () => void;
	finalFocus?: ComponentProps<typeof DialogPopup>["finalFocus"] | undefined;
}
export function Modal({
	title,
	children,
	onClose,
	finalFocus,
	wide,
}: ModalProps) {
	const [opener] = useState(() =>
		document.activeElement instanceof HTMLElement
			? document.activeElement
			: null,
	);
	return (
		<Dialog
			open
			onOpenChange={(open) => {
				if (!open) onClose();
			}}
		>
			<DialogPopup
				className={wide ? `${styles.popup} ${styles.wide}` : styles.popup}
				finalFocus={finalFocus ?? (() => opener)}
				closeProps={{
					"aria-label": "Закрыть",
					render: <Button variant="ghost" size="icon" tooltip="Закрыть окно" />,
				}}
			>
				<DialogHeader>
					<DialogTitle>{title}</DialogTitle>
				</DialogHeader>
				<DialogPanel className={styles.body}>{children}</DialogPanel>
			</DialogPopup>
		</Dialog>
	);
}
