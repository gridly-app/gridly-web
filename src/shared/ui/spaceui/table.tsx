"use client";

import type { useRender } from "@base-ui/react/use-render";
import { clsx } from "clsx";
import type React from "react";
import { ScrollArea } from "@/shared/ui/spaceui/scroll-area";

import css from "./table.module.css";

export type TableVariant = "default" | "card";

export type TableProps = React.ComponentProps<"table"> & {
	variant?: TableVariant;
	render?: useRender.ComponentProps<"div">["render"];
};

export function Table({
	className,
	variant = "default",
	render,
	...props
}: TableProps): React.ReactElement {
	return (
		<ScrollArea
			className={css.container}
			clampContentMinWidth={false}
			data-slot="table-container"
			data-variant={variant}
		>
			<table
				className={clsx(css.root, className)}
				data-slot="table"
				{...props}
			/>
		</ScrollArea>
	);
}

export function TableHeader({
	className,
	...props
}: React.ComponentProps<"thead">): React.ReactElement {
	return (
		<thead
			className={clsx(css.header, className)}
			data-slot="table-header"
			{...props}
		/>
	);
}

export function TableBody({
	className,
	...props
}: React.ComponentProps<"tbody">): React.ReactElement {
	return (
		<tbody
			className={clsx(css.body, className)}
			data-slot="table-body"
			{...props}
		/>
	);
}

export function TableRow({
	className,
	...props
}: React.ComponentProps<"tr">): React.ReactElement {
	return (
		<tr className={clsx(css.row, className)} data-slot="table-row" {...props} />
	);
}

export function TableHead({
	className,
	...props
}: React.ComponentProps<"th">): React.ReactElement {
	return (
		<th
			className={clsx(css.head, className)}
			data-slot="table-head"
			{...props}
		/>
	);
}

export function TableCell({
	className,
	...props
}: React.ComponentProps<"td">): React.ReactElement {
	return (
		<td
			className={clsx(css.cell, className)}
			data-slot="table-cell"
			{...props}
		/>
	);
}
