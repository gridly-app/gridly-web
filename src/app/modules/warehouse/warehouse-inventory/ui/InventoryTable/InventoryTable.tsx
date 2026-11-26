import {
	IconChevronDown,
	IconChevronRight,
	IconTrash,
} from "@tabler/icons-react";
import { Fragment, useState } from "react";
import { StatusBadge as Badge } from "@/ports/warehouse";
import { Button, IconButton } from "@/shared/ui/controls";
import {
	Table,
	TableActions,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableNote,
	TableRow,
} from "@/shared/ui/dataDisplay";
import type { InventoryStock } from "../../model/inventoryStock";
import type { InventoryWarehouse } from "../../model/warehouseResources";
import { StockLinks } from "../StockLinks/StockLinks";
import { StockSource } from "../StockSource/StockSource";
import stockTableStyles from "../../shared.module.css";
import { totalReserved } from "@/domain/warehouse";

export function InventoryTable({
	items,
	hiddenColumns,
	warehouse,
	pending,
	highlightUnpriced,
	onWriteOff,
}: {
	items: readonly InventoryStock[];
	hiddenColumns: readonly number[];
	warehouse: InventoryWarehouse;
	pending: boolean;
	highlightUnpriced?: boolean;
	onWriteOff: (stock: InventoryStock) => void;
}) {
	const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
	const deliveries = new Map(
		warehouse.orders
			.filter((order) => order.kind === "inbound")
			.map((order) => [order.id, order]),
	);
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
					<TableHead>Товар / поставка</TableHead>
					<TableHead>Зона</TableHead>
					<TableHead>Количество</TableHead>
					<TableHead>Резерв</TableHead>
					<TableHead>Годность</TableHead>
					<TableHead data-column="actions">Действия</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{[...groups].map(([key, rows]) => {
					const first = rows[0];
					if (!first) return null;
					const isOpen = expanded.has(key);
					const quantity = rows.reduce((sum, row) => sum + row.quantity, 0);
					const reserved = totalReserved(rows);
					const sourceTotals = new Map<string, number>();

					if (isOpen) {
						for (const stock of rows) {
							const orderId = stock.sourceOrderId;
							if (!orderId) continue;

							sourceTotals.set(
								orderId,
								(sourceTotals.get(orderId) ?? 0) + stock.quantity,
							);
						}
					}

					return (
						<Fragment key={key}>
							<TableRow
								className={stockTableStyles.unpriced}
								data-unpriced-highlight={highlightUnpriced}
							>
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
										<span>{first.productName ?? "Товар"}</span>
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
								rows.map((stock) => {
									const orderId = stock.sourceOrderId;
									const delivery = orderId
										? deliveries.get(orderId)
										: undefined;
									const sourceTotal = orderId
										? sourceTotals.get(orderId)
										: undefined;

									if (orderId) sourceTotals.delete(orderId);

									return (
										<TableRow
											key={stock.id}
											className={stockTableStyles.unpriced}
											data-unpriced-highlight={highlightUnpriced}
										>
											<TableCell>
												<StockSource
													stock={stock}
													warehouseId={warehouse.id}
													order={delivery}
													total={sourceTotal}
												/>
											</TableCell>
											<TableCell>{stock.zoneName}</TableCell>
											<TableCell>
												{stock.quantity.toLocaleString("ru-RU")} шт.
											</TableCell>
											<TableCell>
												{stock.reserved === undefined
													? "—"
													: `${stock.reserved} шт.`}
											</TableCell>
											<TableCell>
												{stock.isExpired && <Badge value="expired" />}
												<TableNote as="span">
													{stock.expires || "Без срока"}
												</TableNote>
											</TableCell>
											<TableCell>
												<TableActions>
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
									);
								})}
						</Fragment>
					);
				})}
			</TableBody>
		</Table>
	);
}
