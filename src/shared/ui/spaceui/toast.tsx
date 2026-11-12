import { Toast } from "@base-ui/react/toast";
import { clsx } from "clsx";
import {
	CircleAlertIcon,
	CircleCheckIcon,
	InfoIcon,
	LoaderCircleIcon,
	TriangleAlertIcon,
} from "lucide-react";
import type React from "react";
import { buttonVariants } from "@/shared/ui/spaceui/button";

import css from "./toast.module.css";

const TOAST_ICONS = {
	error: CircleAlertIcon,
	info: InfoIcon,
	loading: LoaderCircleIcon,
	success: CircleCheckIcon,
	warning: TriangleAlertIcon,
} as const;

type SwipeDirection = "up" | "down" | "left" | "right";

type ToastData = {
	rootProps?: Omit<
		React.ComponentProps<typeof Toast.Root>,
		"children" | "className" | "swipeDirection" | "toast"
	>;
	tooltipStyle?: boolean;
};

function getSwipeDirection(position: ToastPosition): SwipeDirection[] {
	const verticalDirection: SwipeDirection = position.startsWith("top")
		? "up"
		: "down";

	if (position.includes("center")) {
		return [verticalDirection];
	}

	if (position.includes("left")) {
		return ["left", verticalDirection];
	}

	return ["right", verticalDirection];
}

function upsertReplayClassName(toast: {
	type?: string | undefined;
	updateKey?: number | undefined;
}): string | undefined {
	const k = toast.updateKey ?? 0;
	if (k <= 0) return undefined;
	const isEven = k % 2 === 0;
	if (toast.type === "error") {
		return isEven
			? "motion-safe:animate-toast-error-even"
			: "motion-safe:animate-toast-error-odd";
	}
	return isEven
		? "motion-safe:animate-toast-success-even"
		: "motion-safe:animate-toast-success-odd";
}

function Toasts({
	position,
	portalProps,
}: {
	position: ToastPosition;
	portalProps?: React.ComponentProps<typeof Toast.Portal> | undefined;
}): React.ReactElement {
	const { toasts } = Toast.useToastManager();
	const swipeDirection = getSwipeDirection(position);

	return (
		<Toast.Portal data-slot="toast-portal" {...portalProps}>
			<Toast.Viewport
				className={clsx(css.viewport)}
				data-position={position}
				data-slot="toast-viewport"
			>
				{toasts.map((toast) => {
					const Icon = toast.type
						? TOAST_ICONS[toast.type as keyof typeof TOAST_ICONS]
						: null;
					const toastData = toast.data as ToastData | undefined;

					return (
						<Toast.Root
							key={toast.id}
							className={clsx(css.toast, upsertReplayClassName(toast))}
							{...toastData?.rootProps}
							data-position={position}
							swipeDirection={swipeDirection}
							toast={toast}
						>
							<Toast.Content className={css.stackContent}>
								<div className={css.contentMain}>
									{Icon && (
										<div className={css.iconContainer} data-slot="toast-icon">
											<Icon className={css.stackIcon} />
										</div>
									)}

									<div className={css.message}>
										<Toast.Title
											className={css.title}
											data-slot="toast-title"
										/>
										<Toast.Description
											className={css.description}
											data-slot="toast-description"
										/>
									</div>
								</div>
								{toast.actionProps && (
									<Toast.Action
										className={buttonVariants({ size: "xs" })}
										data-slot="toast-action"
									>
										{toast.actionProps.children}
									</Toast.Action>
								)}
							</Toast.Content>
						</Toast.Root>
					);
				})}
			</Toast.Viewport>
		</Toast.Portal>
	);
}

export const toastManager: ReturnType<typeof Toast.createToastManager> =
	Toast.createToastManager();

export type ToastPosition =
	| "top-left"
	| "top-center"
	| "top-right"
	| "bottom-left"
	| "bottom-center"
	| "bottom-right";

export interface ToastProviderProps extends Toast.Provider.Props {
	position?: ToastPosition;
	portalProps?: React.ComponentProps<typeof Toast.Portal> | undefined;
}

export function ToastProvider({
	children,
	position = "bottom-right",
	portalProps,
	...props
}: ToastProviderProps): React.ReactElement {
	return (
		<Toast.Provider toastManager={toastManager} {...props}>
			{children}
			<Toasts portalProps={portalProps} position={position} />
		</Toast.Provider>
	);
}
