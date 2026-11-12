import {
	IconAlertCircle,
	IconAlertTriangle,
	IconCircleCheck,
	IconInfoCircle,
} from "@tabler/icons-react";
import { clsx } from "clsx";
import type { ComponentProps, ReactNode } from "react";
import {
	Alert,
	AlertAction,
	AlertDescription,
	AlertIcon,
	AlertTitle,
} from "../spaceui/alert";
import { Empty, EmptyDescription } from "../spaceui/empty";
import { Spinner } from "../spaceui/spinner";
import styles from "./Feedback.module.css";
export type FeedbackProps = Omit<ComponentProps<"div">, "title"> & {
	tone?:
		| "error"
		| "success"
		| "warning"
		| "info"
		| "loading"
		| "empty"
		| undefined;
	fill?: boolean | undefined;
	inset?: boolean | undefined;
	title?: string | undefined;
	action?: ReactNode;
};
export function Feedback({
	tone = "loading",
	fill,
	inset,
	title,
	action,
	className,
	children,
	...props
}: FeedbackProps) {
	if (tone === "empty")
		return (
			<Empty className={clsx(fill && styles.emptyFill, className)} {...props}>
				<EmptyDescription>{children}</EmptyDescription>
			</Empty>
		);
	const variant = tone === "loading" ? "info" : tone;
	const Icon =
		tone === "error"
			? IconAlertCircle
			: tone === "warning"
				? IconAlertTriangle
				: tone === "success"
					? IconCircleCheck
					: IconInfoCircle;
	return (
		<Alert
			variant={variant}
			role={tone === "error" || tone === "warning" ? "alert" : "status"}
			className={clsx(
				styles.alert,
				fill && styles.alertFill,
				inset && styles.inset,
				className,
			)}
			data-tone={variant}
			{...props}
		>
			<AlertIcon>
				{tone === "loading" ? (
					<Spinner aria-hidden="true" />
				) : (
					<Icon aria-hidden="true" />
				)}
			</AlertIcon>
			{title && <AlertTitle>{title}</AlertTitle>}
			<AlertDescription>{children}</AlertDescription>
			{action && <AlertAction>{action}</AlertAction>}
		</Alert>
	);
}
