import {
	IconAlertCircle,
	IconAlertTriangle,
	IconCircleCheck,
	IconInfoCircle,
	IconX,
} from "@tabler/icons-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { Button } from "../controls";
import {
	Alert,
	AlertAction,
	AlertDescription,
	AlertIcon,
	AlertTitle,
} from "../spaceui/alert";
import styles from "./FloatingAlerts.module.css";

const icons = {
	error: IconAlertCircle,
	warning: IconAlertTriangle,
	info: IconInfoCircle,
	success: IconCircleCheck,
};

export interface FloatingAlertItem {
	id: string;
	tone: keyof typeof icons;
	title: string;
	description?: ReactNode;
	action?: ReactNode;
	onDismiss: () => void;
}

export function FloatingAlerts({ items }: { items: FloatingAlertItem[] }) {
	const reduce = useReducedMotion();
	return createPortal(
		<section className={styles.viewport} aria-label="Уведомления приложения">
			<AnimatePresence>
				{items.map(({ id, tone, title, description, action, onDismiss }) => {
					const Icon = icons[tone];
					return (
						<motion.div
							key={id}
							initial={reduce ? false : { x: "110%" }}
							animate={{ x: "0%" }}
							exit={reduce ? { opacity: 0 } : { x: "110%", opacity: 0 }}
							transition={
								reduce
									? { duration: 0 }
									: { type: "spring", stiffness: 420, damping: 26 }
							}
						>
							<Alert
								variant={tone}
								role={
									tone === "warning" || tone === "error" ? "alert" : "status"
								}
							>
								<AlertIcon badge aria-hidden="true">
									<Icon />
								</AlertIcon>
								<AlertTitle>{title}</AlertTitle>
								{description && (
									<AlertDescription>{description}</AlertDescription>
								)}
								<AlertAction>
									{action}
									<Button
										variant="ghost"
										size="icon"
										aria-label="Закрыть уведомление"
										onClick={onDismiss}
									>
										<IconX size={16} />
									</Button>
								</AlertAction>
							</Alert>
						</motion.div>
					);
				})}
			</AnimatePresence>
		</section>,
		document.body,
	);
}
