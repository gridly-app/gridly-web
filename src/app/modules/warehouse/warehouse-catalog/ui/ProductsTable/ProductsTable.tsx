import {
	IconArchive,
	IconArchiveOff,
	IconArrowDown,
	IconArrowUp,
	IconPencil,
} from "@tabler/icons-react";
import { useState } from "react";

import type { Product } from "@/domain/warehouse";
import { StatusBadge } from "@/ports/warehouse";
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
import {
	formatProductValue,
	type ProductColumn,
	productColumns,
	type ProductSort,
	type ProductSortKey,
	sortProducts,
} from "../../model/productColumns";

export function ProductsTable({
	items,
	columns,
	isPending,
	onEdit,
	onToggleArchive,
}: {
	items: readonly CatalogProduct[];
	columns: readonly ProductColumn[];
	isPending: boolean;
	onEdit: (product: Product) => void;
	onToggleArchive: (id: string) => void;
}) {
	const [sort, setSort] = useState<ProductSort | null>(null);
	const visibleColumns = productColumns.filter((column) =>
		columns.includes(column.key),
	);
	const sorted = sortProducts(items, sort, [...columns]);

	function handleSort(key: ProductSortKey) {
		const isCurrent = sort?.key === key;

		setSort({ key, isDescending: isCurrent && !sort.isDescending });
	}

	return (
		<Table>
			<TableHeader>
				<TableRow>
					<SortableHead
						sortKey="name"
						label="Товар"
						sort={sort}
						onSort={handleSort}
					/>
					{visibleColumns.map((column) => (
						<SortableHead
							key={column.key}
							sortKey={column.key}
							label={column.label}
							sort={sort}
							onSort={handleSort}
						/>
					))}
					<TableHead data-column="actions">Действия</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{sorted.map((product) => (
					<TableRow key={product.id}>
						<TableCell>
							<Link
								to={{
									search: new URLSearchParams({
										product: product.id,
									}).toString(),
								}}
							>
								{product.name}
							</Link>
							{product.archived && <StatusBadge value="Архив" />}
						</TableCell>
						{visibleColumns.map((column) => (
							<TableCell key={column.key}>
								{formatProductValue(column.key, column.value(product))}
							</TableCell>
						))}
						<TableCell>
							<ProductActions
								product={product}
								isPending={isPending}
								onEdit={onEdit}
								onToggleArchive={onToggleArchive}
							/>
						</TableCell>
					</TableRow>
				))}
			</TableBody>
		</Table>
	);
}

function SortableHead({
	sortKey,
	label,
	sort,
	onSort,
}: {
	sortKey: ProductSortKey;
	label: string;
	sort: ProductSort | null;
	onSort: (key: ProductSortKey) => void;
}) {
	const isCurrent = sort?.key === sortKey;
	const isDescending = isCurrent && sort.isDescending;
	const ariaSort = isDescending ? "descending" : "ascending";
	const SortIcon = isDescending ? IconArrowDown : IconArrowUp;

	function handleClick() {
		onSort(sortKey);
	}

	return (
		<TableHead aria-sort={isCurrent ? ariaSort : "none"}>
			<Button
				size="sm"
				variant="ghost"
				aria-label={`Сортировать: ${label}`}
				onClick={handleClick}
			>
				{label}
				{isCurrent && <SortIcon size={14} />}
			</Button>
		</TableHead>
	);
}

function ProductActions({
	product,
	isPending,
	onEdit,
	onToggleArchive,
}: {
	product: CatalogProduct;
	isPending: boolean;
	onEdit: (product: Product) => void;
	onToggleArchive: (id: string) => void;
}) {
	const archiveAction = product.archived ? "restore" : "archive";
	const archiveLabel = product.archived ? "Восстановить" : "Архивировать";
	const ArchiveIcon = product.archived ? IconArchiveOff : IconArchive;
	const canEdit = Boolean(product.allowedActions?.includes("edit"));
	const canToggleArchive = Boolean(
		product.allowedActions?.includes(archiveAction),
	);

	function handleEdit() {
		onEdit(product);
	}

	function handleToggleArchive() {
		onToggleArchive(product.id);
	}

	return (
		<TableActions>
			<IconButton
				label="Изменить"
				icon={<IconPencil size={16} />}
				variant="secondary"
				disabled={isPending || !canEdit}
				onClick={handleEdit}
			/>
			<IconButton
				label={archiveLabel}
				icon={<ArchiveIcon size={16} />}
				variant="ghost"
				disabled={isPending || !canToggleArchive}
				onClick={handleToggleArchive}
			/>
		</TableActions>
	);
}
