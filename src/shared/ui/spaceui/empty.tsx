import { cva, type VariantProps } from "class-variance-authority";
import { clsx } from "clsx";
import type React from "react";

import css from "./empty.module.css";

const emptyMediaVariants = cva(css.emptyMedia, {
	defaultVariants: {
		variant: "default",
	},
	variants: {
		variant: {
			default: css.variantDefault,
			icon: css.variantIcon,
		},
	},
});

export function Empty({
	className,
	...props
}: React.ComponentProps<"div">): React.ReactElement {
	return (
		<div className={clsx(css.root, className)} data-slot="empty" {...props} />
	);
}

export function EmptyHeader({
	className,
	...props
}: React.ComponentProps<"div">): React.ReactElement {
	return (
		<div
			className={clsx(css.header, className)}
			data-slot="empty-header"
			{...props}
		/>
	);
}

export function EmptyMedia({
	className,
	variant = "default",
	...props
}: React.ComponentProps<"div"> &
	VariantProps<typeof emptyMediaVariants>): React.ReactElement {
	return (
		<div
			className={clsx(css.media, className)}
			data-slot="empty-media"
			data-variant={variant}
			{...props}
		>
			{variant === "icon" && (
				<>
					<div
						aria-hidden="true"
						className={clsx(
							emptyMediaVariants({ className, variant }),
							css.stackedMediaLeft,
						)}
					/>
					<div
						aria-hidden="true"
						className={clsx(
							emptyMediaVariants({ className, variant }),
							css.stackedMediaRight,
						)}
					/>
				</>
			)}
			<div
				className={clsx(emptyMediaVariants({ className, variant }))}
				{...props}
			/>
		</div>
	);
}

export function EmptyTitle({
	className,
	...props
}: React.ComponentProps<"div">): React.ReactElement {
	return (
		<div
			className={clsx(css.title, className)}
			data-slot="empty-title"
			{...props}
		/>
	);
}

export function EmptyDescription({
	className,
	...props
}: React.ComponentProps<"p">): React.ReactElement {
	return (
		<div
			className={clsx(css.description, className)}
			data-slot="empty-description"
			{...props}
		/>
	);
}
