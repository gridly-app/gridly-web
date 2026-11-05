import {
	IconChevronDown,
	IconChevronRight,
	IconPencil,
	IconTrash,
} from "@tabler/icons-react";
import { Fragment, useState } from "react";
import {
	StatusBadge as Badge,
	type Stock,
	type Warehouse,
} from "@/entities/warehouse";
import {
	Button,
	IconButton,
	Table,
	TableActions,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/shared/ui";
import type { InventoryStock } from "../model/inventoryStock";
import { StockLinks } from "./StockLinks";
import { StockQuantity } from "./StockQuantity";

export function InventoryTable({
	items,
	hiddenColumns,
	warehouse,
	pending,
	canEdit,
	highlightUnpriced,
	onWriteOff,
	onEdit,
	onSave,
}: {
	items: readonly InventoryStock[];
	hiddenColumns: readonly number[];
	warehouse: Warehouse;
	pending: boolean;
	canEdit: boolean;
	highlightUnpriced?: boolean;
	onWriteOff: (stock: InventoryStock) => void;
	onEdit: (stock: InventoryStock) => void;
	onSave: (stock: Stock) => Promise<void>;
}) {
	const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
	const groups = new Map<string, InventoryStock[]>();
	for (const item of items) {
		const key = JSON.stringify([item.product, item.zoneKey]);
		const rows = groups.get(key) ?? [];
		rows.push(item);
		groups.set(key, rows);
	}

	return (
		<Table hiddenColumns={hiddenColumns}>
			<TableHeader>
				<TableRow>
					<TableHead>Товар / партия</TableHead>
					<TableHead>Зона</TableHead>
					<TableHead>Количество</TableHead>
					<TableHead>Резерв</TableHead>
					<TableHead>Годность</TableHead>
					<TableHead>Действия</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{[...groups].map(([key, rows]) => {
					const first = rows[0];
					if (!first) return null;
					const isOpen = expanded.has(key);
					const quantity = rows.reduce((sum, row) => sum + row.quantity, 0);
					const reserved = rows.reduce(
						(sum, row) => sum + (row.reserved ?? 0),
						0,
					);
					return (
						<Fragment key={key}>
							<TableRow data-unpriced-highlight={highlightUnpriced}>
								<TableCell>
									<Button
										variant="ghost"
										size="sm"
										aria-expanded={isOpen}
										aria-label={`Партии: ${first.productName ?? "Товар"} · ${first.zoneName}`}
										onClick={() => {
											setExpanded((current) => {
												const next = new Set(current);
												if (next.has(key)) next.delete(key);
												else next.add(key);
												return next;
											});
										}}
									>
										{isOpen ? (
											<IconChevronDown size={16} />
										) : (
											<IconChevronRight size={16} />
										)}
										{first.productName ?? "Товар"}
									</Button>
								</TableCell>
								<TableCell>{first.zoneName}</TableCell>
								<TableCell>
									<strong>{quantity.toLocaleString("ru-RU")} шт.</strong>
								</TableCell>
								<TableCell>
									{rows.some((row) => row.reserved === undefined)
										? "—"
										: `${reserved.toLocaleString("ru-RU")} шт.`}
								</TableCell>
								<TableCell>Партий: {rows.length}</TableCell>
								<TableCell>
									<StockLinks
										warehouseId={warehouse.id}
										productId={first.product}
										orders={warehouse.orders}
									/>
								</TableCell>
							</TableRow>
							{isOpen &&
								rows.map((stock) => (
									<TableRow
										key={stock.id}
										data-unpriced-highlight={highlightUnpriced}
									>
										<TableCell>
											<span className="ps-8">
												Партия {(stock.batchId || stock.id).slice(0, 8)}
											</span>
										</TableCell>
										<TableCell>{stock.zoneName}</TableCell>
										<TableCell>
											<StockQuantity
												stock={stock}
												editable={canEdit && /^\d+,\d+$/.test(stock.cell)}
												pending={pending}
												onSave={onSave}
											/>
										</TableCell>
										<TableCell>
											{stock.reserved === undefined
												? "—"
												: `${stock.reserved} шт.`}
										</TableCell>
										<TableCell>
											{stock.isExpired && <Badge value="expired" />}
											<span className="table-note">
												{stock.expires || "Без срока"}
											</span>
										</TableCell>
										<TableCell>
											<TableActions>
												{canEdit && (
													<IconButton
														label="Корректировать партию"
														icon={<IconPencil size={16} />}
														disabled={pending}
														onClick={() => onEdit(stock)}
													/>
												)}
												<IconButton
													label="Списать"
													icon={<IconTrash size={16} />}
													variant="destructive-outline"
													title={stock.writeOffBlockedReason}
													disabled={pending || !stock.canWriteOff}
													onClick={() => onWriteOff(stock)}
												/>
											</TableActions>
										</TableCell>
									</TableRow>
								))}
						</Fragment>
					);
				})}
			</TableBody>
		</Table>
	);
}
