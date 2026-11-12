import { cva, type VariantProps } from "class-variance-authority";
import { clsx } from "clsx";
import type * as React from "react";

import css from "./status-badge.module.css";

export const badgeVariants = cva(css.badge, {
	variants: {
		variant: {
			default: css.variantDefault,
			inverted: css.variantInverted,
			outline: css.variantOutline,
		},
		size: {
			xs: css.sizeXs,
			sm: css.sizeSm,
			default: css.sizeSm,
			md: css.sizeMd,
			lg: css.sizeLg,
		},
		badgeSize: {
			xs: css.badgeSizeXs,
			sm: css.badgeSizeSm,
			default: css.badgeSizeDefault,
			md: css.badgeSizeMd,
			lg: css.badgeSizeLg,
		},
		circle: {
			true: css.circleTrue,
			false: "",
		},
	},
	defaultVariants: {
		variant: "default",
		size: "default",
		circle: false,
	},
});

export interface BadgeProps
	extends React.HTMLAttributes<HTMLDivElement>,
		VariantProps<typeof badgeVariants> {
	contentClassName?: string;
}

export function Badge({
	className,
	variant,
	size,
	circle,
	contentClassName,
	...props
}: BadgeProps) {
	return (
		<div
			className={clsx(
				badgeVariants({ variant, badgeSize: size, circle }),
				css.badgeCircle,
				className,
			)}
			{...props}
		>
			<span className={clsx(css.badgeText, contentClassName)}>
				{props.children}
			</span>
		</div>
	);
}

export const statusIndicatorVariants = cva(css.statusIndicator, {
	variants: {
		status: {
			online: css.statusOnline,
			offline: css.statusOffline,
			busy: css.statusBusy,
			away: css.statusAway,
			available: css.statusOnline,
			error: css.statusError,
			warning: css.statusWarning,
			info: css.statusInfo,
		},
		size: {
			xs: css.indicatorXs,
			sm: css.indicatorSm,
			default: css.indicatorDefault,
			md: css.indicatorMd,
			lg: css.indicatorLg,
		},
		animated: {
			true: css.animatedTrue,
			false: "",
		},
	},
	defaultVariants: {
		status: "online",
		size: "default",
		animated: true,
	},
});

export interface StatusBadgeProps
	extends React.HTMLAttributes<HTMLDivElement>,
		VariantProps<typeof badgeVariants> {
	status?:
		| "online"
		| "offline"
		| "busy"
		| "away"
		| "available"
		| "error"
		| "warning"
		| "info";
	primaryText?: string;
	showIndicator?: boolean;
	animated?: boolean;
	mode?: "stack" | "inline";
	indicatorBadge?: boolean;
	indicatorClassName?: string;
	primaryTextClassName?: string;
	secondaryTextClassName?: string;
}

export function StatusBadge({
	className,
	variant,
	size,
	mode = "inline",
	status = "online",
	primaryText,
	showIndicator = true,
	animated = true,
	indicatorBadge = false,
	indicatorClassName,
	primaryTextClassName,
	secondaryTextClassName,
	...props
}: StatusBadgeProps) {
	const IndicatorComponent = ({ className }: { className?: string }) =>
		showIndicator && (
			<span className={clsx(css.indicator, className)}>
				<span
					className={clsx(css.indicatorPulse, animated && css.indicatorPulsing)}
					data-status={status}
				/>
				<span
					className={clsx(
						css.indicatorDot,
						statusIndicatorVariants({ status, size, animated: false }),
						indicatorClassName,
					)}
				/>
			</span>
		);

	const innerBadgeStyle =
		variant === "inverted"
			? css.innerBadge
			: variant === "outline"
				? css.innerBadgeOutline
				: css.innerBadgeDefault;

	if (mode === "stack") {
		return (
			<div
				className={clsx(
					css.stack,
					badgeVariants({ variant, size }),
					indicatorBadge ? css.stackWithBadge : css.stackWithoutBadge,
					className,
				)}
				data-slot="status-badge"
				{...props}
			>
				{indicatorBadge ? (
					<Badge
						size={size}
						circle
						className={clsx(
							css.indicatorBadge,
							size === "xs"
								? css.indicatorBadgeXs
								: size === "sm"
									? css.indicatorBadgeSm
									: size === "lg"
										? css.indicatorBadgeLg
										: css.indicatorBadgeRegular,
							innerBadgeStyle,
						)}
						contentClassName={clsx(css.indicatorBadgeContent)}
					>
						<IndicatorComponent />
					</Badge>
				) : (
					<IndicatorComponent className={clsx(css.indicatorInStack)} />
				)}
				<div className={css.stackText}>
					{primaryText && (
						<span className={clsx(css.stackPrimary, primaryTextClassName)}>
							{primaryText}
						</span>
					)}
					{props.children && (
						<span className={clsx(css.stackSecondary, secondaryTextClassName)}>
							{props.children}
						</span>
					)}
				</div>
			</div>
		);
	}

	return (
		<div
			className={clsx(
				css.inlineBadge,
				badgeVariants({ variant, size }),
				className,
			)}
			data-slot="status-badge"
			{...props}
		>
			<Badge size={size} circle={!primaryText} className={innerBadgeStyle}>
				<div className={css.inlineContent}>
					<IndicatorComponent />
					{primaryText && (
						<span className={clsx(css.inlinePrimary, primaryTextClassName)}>
							{primaryText}
						</span>
					)}
				</div>
			</Badge>
			{props.children && (
				<span className={clsx(css.inlineSecondary, secondaryTextClassName)}>
					{props.children}
				</span>
			)}
		</div>
	);
}
