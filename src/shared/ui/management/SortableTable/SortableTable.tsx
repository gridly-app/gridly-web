import {
	IconArrowsSort,
	IconChevronDown,
	IconChevronUp,
} from "@tabler/icons-react";
import { type ReactNode, useId } from "react";

import { Button } from "@/shared/ui/controls";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/shared/ui/dataDisplay";
import { Feedback } from "@/shared/ui/feedback";

import {
	type SortColumn,
	type SortOrder,
	sortTableRows,
	useTableSort,
} from "./useTableSort";

import adminTableStyles from "./SortableTable.module.css";

type ColumnHeading = { id: string; label: string; width?: string };
type SortableColumn<Row> = ColumnHeading & {
	value: NonNullable<SortColumn<Row>["value"]>;
	cell?: (row: Row) => ReactNode;
};
type DisplayColumn<Row> = ColumnHeading & {
	value?: never;
	cell: (row: Row) => ReactNode;
};
type TableColumn<Row> = SortableColumn<Row> | DisplayColumn<Row>;

export type TableColumns<Row> = readonly [
	SortableColumn<Row>,
	...TableColumn<Row>[],
];

type TableProps<Row> = {
	label: string;
	columns: TableColumns<Row>;
	rows: Row[];
	rowKey: (row: Row) => string;
};

const sortIcons = {
	ascending: IconChevronUp,
	descending: IconChevronDown,
};

function SortableHeading({
	label,
	id,
	direction,
	onSort,
}: {
	label: string;
	id: string;
	direction: "ascending" | "descending" | undefined;
	onSort: (id: string) => void;
}) {
	const Icon = direction ? sortIcons[direction] : IconArrowsSort;

	function handleSort() {
		onSort(id);
	}

	return (
		<TableHead
			scope="col"
			className={adminTableStyles.cell}
			aria-sort={direction}
		>
			<Button
				variant="ghost"
				size="sm"
				className={adminTableStyles.sort}
				type="button"
				onClick={handleSort}
			>
				{label}
				<Icon
					className={adminTableStyles.sortIcon}
					size={14}
					aria-hidden="true"
				/>
			</Button>
		</TableHead>
	);
}

export function SortableTable<Row>({
	label,
	columns,
	rows,
	rowKey,
	sort,
	onSort,
}: TableProps<Row> & { sort: SortOrder; onSort: (id: string) => void }) {
	const captionId = useId();

	if (!rows.length) return <Feedback tone="empty">Ничего не найдено</Feedback>;

	const columnWidth = columns.some(({ width }) => width)
		? undefined
		: `${100 / columns.length}%`;
	const direction = sort.descending ? "descending" : "ascending";

	function renderHeading({ id, label, value }: TableColumn<Row>) {
		if (!value) {
			return (
				<TableHead key={id} className={adminTableStyles.cell} scope="col">
					{label}
				</TableHead>
			);
		}

		const sortDirection = sort.id === id ? direction : undefined;

		return (
			<SortableHeading
				key={id}
				id={id}
				label={label}
				direction={sortDirection}
				onSort={onSort}
			/>
		);
	}

	return (
		<Table
			className={adminTableStyles.table}
			containerClassName={adminTableStyles.tableContainer}
			aria-labelledby={captionId}
		>
			<caption id={captionId} className={adminTableStyles.caption}>
				{label}
			</caption>
			<colgroup>
				{columns.map(({ id, width }) => (
					<col key={id} style={{ width: width ?? columnWidth }} />
				))}
			</colgroup>
			<TableHeader className={adminTableStyles.header}>
				<TableRow>{columns.map(renderHeading)}</TableRow>
			</TableHeader>
			<TableBody>
				{rows.map((row) => (
					<TableRow key={rowKey(row)}>
						{columns.map((column) => (
							<TableCell key={column.id} className={adminTableStyles.bodyCell}>
								{renderCell(column, row)}
							</TableCell>
						))}
					</TableRow>
				))}
			</TableBody>
		</Table>
	);
}

function renderCell<Row>(column: TableColumn<Row>, row: Row) {
	if (column.value) return column.cell ? column.cell(row) : column.value(row);

	return column.cell(row);
}

export function SortedTable<Row>({
	descending,
	rows,
	...table
}: TableProps<Row> & { descending?: boolean }) {
	const { sort, onSort } = useTableSort(table.columns[0].id, descending);
	const column = table.columns.find(({ id }) => id === sort.id);
	const sorted = sortTableRows(rows, column?.value, sort.descending);

	return <SortableTable {...table} rows={sorted} sort={sort} onSort={onSort} />;
}
