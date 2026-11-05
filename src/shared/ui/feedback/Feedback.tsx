import {
	IconAlertCircle,
	IconAlertTriangle,
	IconCircleCheck,
	IconInfoCircle,
} from "@tabler/icons-react";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/shared/lib/spaceui/utils";
import {
	Alert,
	AlertAction,
	AlertDescription,
	AlertIcon,
	AlertTitle,
} from "../spaceui/alert";
import { Empty, EmptyDescription } from "../spaceui/empty";
import { Spinner } from "../spaceui/spinner";
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
	title?: string | undefined;
	action?: ReactNode;
};
export function Feedback({
	tone = "loading",
	fill,
	title,
	action,
	className,
	children,
	...props
}: FeedbackProps) {
	if (tone === "empty")
		return (
			<Empty className={cn(fill && "min-h-60", className)} {...props}>
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
			className={cn(
				"product-alert",
				fill && "min-h-40 content-center",
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
