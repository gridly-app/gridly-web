import type { ComponentProps } from "react";
import tableStyles from "./Table.module.css";

export type TableProps = ComponentProps<"table">;

export type TableHeaderProps = ComponentProps<"thead">;

export type TableBodyProps = ComponentProps<"tbody">;

export type TableRowProps = ComponentProps<"tr">;

export type TableHeadProps = ComponentProps<"th">;

export type TableCellProps = ComponentProps<"td">;

export function Table({ className = "", ...props }: TableProps) {
	return (
		<table
			className={`${tableStyles.table} ${className}`}
			data-slot="table"
			{...props}
		/>
	);
}

export function TableHeader({ className = "", ...props }: TableHeaderProps) {
	return (
		<thead
			className={`${tableStyles.header} ${className}`}
			data-slot="table-header"
			{...props}
		/>
	);
}

export function TableBody({ className = "", ...props }: TableBodyProps) {
	return <tbody className={className} data-slot="table-body" {...props} />;
}

export function TableRow({ className = "", ...props }: TableRowProps) {
	return (
		<tr
			className={`${tableStyles.row} ${className}`}
			data-slot="table-row"
			{...props}
		/>
	);
}

export function TableHead({ className = "", ...props }: TableHeadProps) {
	return (
		<th
			className={`${tableStyles.head} ${className}`}
			data-slot="table-head"
			{...props}
		/>
	);
}

export function TableCell({ className = "", ...props }: TableCellProps) {
	return (
		<td
			className={`${tableStyles.cell} ${className}`}
			data-slot="table-cell"
			{...props}
		/>
	);
}

export function TableActions({
	className = "",
	...props
}: ComponentProps<"div">) {
	return <div className={`${tableStyles.actions} ${className}`} {...props} />;
}
