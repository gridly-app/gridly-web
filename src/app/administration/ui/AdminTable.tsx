import {
	IconArrowsSort,
	IconChevronDown,
	IconChevronUp,
	IconEdit,
	IconTrash,
} from "@tabler/icons-react";
import { type ComponentProps, type ReactNode, useId, useState } from "react";
import { Button, IconButton } from "@/shared/ui/controls";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/shared/ui/dataDisplay";
import { Feedback } from "@/shared/ui/feedback";
import styles from "../Administration.module.css";

type RowActionProps = Pick<
	ComponentProps<typeof IconButton>,
	"label" | "onClick" | "disabled"
>;

export function EditRowAction(props: RowActionProps) {
	return (
		<IconButton
			{...props}
			icon={<IconEdit aria-hidden="true" />}
			tooltip="Изменить"
			variant="secondary"
		/>
	);
}

export function DeleteRowAction(props: RowActionProps) {
	return (
		<IconButton
			{...props}
			icon={<IconTrash aria-hidden="true" />}
			tooltip="Удалить"
			variant="destructive-outline"
		/>
	);
}

export type AdminColumn<Row> = {
	label: string;
	value?: (row: Row) => string | number;
	cell?: (row: Row) => ReactNode;
};

const collator = new Intl.Collator("ru", {
	numeric: true,
	sensitivity: "base",
});

export function useAdminSort<Row>(
	rows: Row[],
	columns: AdminColumn<Row>[],
	defaultDescending = false,
) {
	const [sort, setSort] = useState({ index: 0, descending: defaultDescending });
	const value = columns[sort.index]?.value;
	const sorted = value
		? [...rows].sort((left, right) => {
				const a = value(left);
				const b = value(right);
				const comparison =
					typeof a === "number" && typeof b === "number"
						? a - b
						: collator.compare(String(a), String(b));
				return sort.descending ? -comparison : comparison;
			})
		: rows;
	return {
		sort,
		sorted,
		onSort: (index: number) =>
			setSort((current) => ({
				index,
				descending: current.index === index && !current.descending,
			})),
	};
}

export function AdminTable<Row>({
	label,
	columns,
	rows,
	rowKey,
	sort,
	onSort,
}: {
	label: string;
	columns: AdminColumn<Row>[];
	rows: Row[];
	rowKey: (row: Row) => string;
	sort: { index: number; descending: boolean };
	onSort: (index: number) => void;
}) {
	const captionId = useId();
	if (!rows.length) return <Feedback tone="empty">Ничего не найдено</Feedback>;
	return (
		<Table
			className={styles.table}
			containerClassName={styles.tableContainer}
			aria-labelledby={captionId}
		>
			<caption id={captionId}>{label}</caption>
			<colgroup>
				{columns.map(({ label }) => (
					<col key={label} style={{ width: `${100 / columns.length}%` }} />
				))}
			</colgroup>
			<TableHeader>
				<TableRow>
					{columns.map((column, index) => {
						if (!column.value)
							return (
								<TableHead key={column.label} scope="col">
									{column.label}
								</TableHead>
							);
						const active = index === sort.index;
						const Icon = active
							? sort.descending
								? IconChevronDown
								: IconChevronUp
							: IconArrowsSort;
						return (
							<TableHead
								key={column.label}
								scope="col"
								aria-sort={
									active
										? sort.descending
											? "descending"
											: "ascending"
										: undefined
								}
							>
								<Button
									variant="ghost"
									size="sm"
									className={styles.sort}
									type="button"
									onClick={() => onSort(index)}
								>
									{column.label}
									<Icon size={14} aria-hidden="true" />
								</Button>
							</TableHead>
						);
					})}
				</TableRow>
			</TableHeader>
			<TableBody>
				{rows.map((row) => (
					<TableRow key={rowKey(row)}>
						{columns.map((column) => (
							<TableCell key={column.label}>
								{column.cell ? column.cell(row) : column.value?.(row)}
							</TableCell>
						))}
					</TableRow>
				))}
			</TableBody>
		</Table>
	);
}

export function SortedAdminTable<Row>(props: {
	label: string;
	columns: AdminColumn<Row>[];
	rows: Row[];
	rowKey: (row: Row) => string;
	descending?: boolean;
}) {
	const order = useAdminSort(props.rows, props.columns, props.descending);
	return <AdminTable {...props} {...order} rows={order.sorted} />;
}
