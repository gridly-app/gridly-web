import {
	IconArchive,
	IconArchiveOff,
	IconArrowDown,
	IconArrowUp,
	IconPencil,
} from "@tabler/icons-react";
import { useState } from "react";
import { StatusBadge as Badge, type Product } from "@/entities/warehouse";

import { Button, IconButton } from "@/shared/ui/controls";
import {
	Table,
	TableActions,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/shared/ui/dataDisplay";
import { Link } from "@/shared/ui/navigation";
import type { CatalogProduct } from "../../model/catalog";
import { type ProductColumn, productColumns } from "../../model/productColumns";

export interface ProductsTableProps {
	items: readonly CatalogProduct[];
	columns: readonly ProductColumn[];
	pending: boolean;
	onEdit: (product: Product) => void;
	onToggleArchive: (id: string) => void;
}

export function ProductsTable({
	items,
	columns,
	pending,
	onEdit,
	onToggleArchive,
}: ProductsTableProps) {
	const [sort, setSort] = useState<{
		key: ProductColumn | "name";
		descending: boolean;
	} | null>(null);
	const visible = productColumns.filter((column) =>
		columns.includes(column.key),
	);
	const activeColumn = visible.find((column) => column.key === sort?.key);
	const direction = sort?.descending ? -1 : 1;
	const sorted =
		sort && (sort.key === "name" || activeColumn)
			? [...items].sort((a, b) => {
					const left = activeColumn ? activeColumn.value(a) : a.name;
					const right = activeColumn ? activeColumn.value(b) : b.name;
					if (left == null) return right == null ? 0 : 1;
					if (right == null) return -1;
					return (
						direction *
						(typeof left === "number" && typeof right === "number"
							? left - right
							: String(left).localeCompare(String(right), "ru-RU", {
									numeric: true,
								}))
					);
				})
			: items;
	function header(key: ProductColumn | "name", label: string) {
		const current = sort?.key === key;
		return (
			<TableHead
				key={key}
				aria-sort={
					current ? (sort.descending ? "descending" : "ascending") : "none"
				}
			>
				<Button
					size="sm"
					variant="ghost"
					aria-label={`Сортировать: ${label}`}
					onClick={() =>
						setSort({ key, descending: current && !sort.descending })
					}
				>
					{label}
					{current &&
						(sort.descending ? (
							<IconArrowDown size={14} />
						) : (
							<IconArrowUp size={14} />
						))}
				</Button>
			</TableHead>
		);
	}

	return (
		<Table>
			<TableHeader>
				<TableRow>
					{header("name", "Товар")}
					{visible.map((column) => header(column.key, column.label))}
					<TableHead>Действия</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{sorted.map((p) => (
					<TableRow key={p.id}>
						<TableCell>
							<Link
								to={{
									search: new URLSearchParams({ product: p.id }).toString(),
								}}
							>
								{p.name}
							</Link>
							{p.archived && <Badge value="Архив" />}
						</TableCell>
						{visible.map((column) => {
							const value = column.value(p);
							const unit = {
								volume: " м³",
								occupancy: " м³",
								quantity: " шт.",
								price: " ₽",
								shelf: " дн.",
							};
							return (
								<TableCell key={column.key}>
									{typeof value === "number"
										? column.key === "shelf" && !value
											? "Без срока"
											: `${value.toLocaleString("ru-RU", { maximumFractionDigits: 3 })}${column.key in unit ? unit[column.key as keyof typeof unit] : ""}`
										: (value ?? "—")}
								</TableCell>
							);
						})}
						<TableCell>
							<TableActions>
								<IconButton
									label="Изменить"
									icon={<IconPencil size={16} />}
									variant="secondary"
									disabled={pending || !p.allowedActions?.includes("edit")}
									onClick={() => onEdit(p)}
								/>
								<IconButton
									label={p.archived ? "Восстановить" : "Архивировать"}
									icon={
										p.archived ? (
											<IconArchiveOff size={16} />
										) : (
											<IconArchive size={16} />
										)
									}
									variant="ghost"
									disabled={
										pending ||
										!p.allowedActions?.includes(
											p.archived ? "restore" : "archive",
										)
									}
									onClick={() => void onToggleArchive(p.id)}
								/>
							</TableActions>
						</TableCell>
					</TableRow>
				))}
			</TableBody>
		</Table>
	);
}
