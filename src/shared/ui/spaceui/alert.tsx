import { cva, type VariantProps } from "class-variance-authority";
import { clsx } from "clsx";
import * as React from "react";

import css from "./alert.module.css";

const alertVariants = cva(css.root, {
	defaultVariants: {
		variant: "default",
	},
	variants: {
		variant: {
			default: css.variantDefault,
			error: css.variantError,
			info: css.variantInfo,
			success: css.variantSuccess,
			warning: css.variantWarning,
		},
	},
});

type AlertVariant = NonNullable<VariantProps<typeof alertVariants>["variant"]>;

const AlertContext = React.createContext<{ variant?: AlertVariant }>({
	variant: "default",
});

const iconVariantStyles: Record<
	AlertVariant,
	{ icon: string | undefined; badge: string | undefined }
> = {
	default: {
		icon: css.iconDefault,
		badge: css.badgeDefault,
	},
	error: {
		icon: css.iconError,
		badge: css.badgeError,
	},
	info: {
		icon: css.iconInfo,
		badge: css.badgeInfo,
	},
	success: {
		icon: css.iconSuccess,
		badge: css.badgeSuccess,
	},
	warning: {
		icon: css.iconWarning,
		badge: css.badgeWarning,
	},
};

export interface AlertProps
	extends React.ComponentProps<"div">,
		VariantProps<typeof alertVariants> {}

export function Alert({
	className,
	variant = "default",
	...props
}: AlertProps): React.ReactElement {
	return (
		<AlertContext.Provider value={{ variant: variant ?? "default" }}>
			<div
				className={clsx(alertVariants({ variant }), className)}
				data-slot="alert"
				role="alert"
				{...props}
			/>
		</AlertContext.Provider>
	);
}

export interface AlertIconProps extends React.ComponentProps<"div"> {
	badge?: boolean;
}

export function AlertIcon({
	className,
	badge = false,
	children,
	...props
}: AlertIconProps): React.ReactElement {
	const { variant = "default" } = React.useContext(AlertContext);
	const styles = iconVariantStyles[variant] ?? iconVariantStyles.default;

	const renderedChildren = React.isValidElement(children)
		? React.cloneElement(children as React.ReactElement<any>, {
				weight: (children.props as any)?.weight ?? "Filled",
			})
		: children;

	return (
		<div
			className={clsx(
				css.icon,
				badge
					? clsx(css.iconBadge, styles.badge)
					: clsx(css.iconWithoutBadge, styles.icon),
				className,
			)}
			data-slot="alert-icon"
			{...props}
		>
			{renderedChildren}
		</div>
	);
}

export function AlertTitle({
	className,
	...props
}: React.ComponentProps<"div">): React.ReactElement {
	return (
		<div
			className={clsx(css.title, className)}
			data-slot="alert-title"
			{...props}
		/>
	);
}

export function AlertDescription({
	className,
	...props
}: React.ComponentProps<"div">): React.ReactElement {
	return (
		<div
			className={clsx(css.description, className)}
			data-slot="alert-description"
			{...props}
		/>
	);
}

export function AlertAction({
	className,
	...props
}: React.ComponentProps<"div">): React.ReactElement {
	return (
		<div
			className={clsx(css.action, className)}
			data-slot="alert-action"
			{...props}
		/>
	);
}
