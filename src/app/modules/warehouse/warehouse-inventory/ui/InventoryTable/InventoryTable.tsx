import {
	IconChevronDown,
	IconChevronRight,
	IconTrash,
} from "@tabler/icons-react";
import { useState } from "react";

import type { Order } from "@/domain/warehouse";
import { StatusBadge } from "@/ports/warehouse";
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

import {
	sourceOrderTotals,
	type StockGroup,
	stockGroups,
} from "../../model/inventoryRows";
import type { InventoryStock } from "../../model/inventoryStock";
import type { InventoryWarehouse } from "../../model/warehouseResources";
import { StockLinks } from "../StockLinks/StockLinks";
import { StockSource } from "../StockSource/StockSource";

import styles from "../../shared.module.css";

const numberFormat = new Intl.NumberFormat("ru-RU");

function formatReserved(reserved: number | undefined) {
	return reserved === undefined ? "—" : `${numberFormat.format(reserved)} шт.`;
}

export function InventoryTable({
	items,
	hiddenColumns,
	warehouse,
	isPending,
	isUnpricedHighlighted,
	onWriteOff,
}: {
	items: readonly InventoryStock[];
	hiddenColumns: readonly number[];
	warehouse: InventoryWarehouse;
	isPending: boolean;
	isUnpricedHighlighted: boolean;
	onWriteOff: (stock: InventoryStock) => void;
}) {
	const [expanded, setExpanded] = useState<ReadonlySet<string>>(
		() => new Set(),
	);
	const deliveries = new Map(
		warehouse.orders
			.filter((order) => order.kind === "inbound")
			.map((order) => [order.id, order]),
	);

	function handleToggle(key: string) {
		setExpanded((current) => {
			const next = new Set(current);

			if (!next.delete(key)) next.add(key);

			return next;
		});
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
				{stockGroups(items).map((group) => (
					<StockGroupRows
						key={group.key}
						group={group}
						warehouse={warehouse}
						deliveries={deliveries}
						isOpen={expanded.has(group.key)}
						isPending={isPending}
						isUnpricedHighlighted={isUnpricedHighlighted}
						onToggle={handleToggle}
						onWriteOff={onWriteOff}
					/>
				))}
			</TableBody>
		</Table>
	);
}

function StockGroupRows({
	group,
	warehouse,
	deliveries,
	isOpen,
	isPending,
	isUnpricedHighlighted,
	onToggle,
	onWriteOff,
}: {
	group: StockGroup;
	warehouse: InventoryWarehouse;
	deliveries: ReadonlyMap<string, Order>;
	isOpen: boolean;
	isPending: boolean;
	isUnpricedHighlighted: boolean;
	onToggle: (key: string) => void;
	onWriteOff: (stock: InventoryStock) => void;
}) {
	const sourceTotals = sourceOrderTotals(group.rows);
	const ToggleIcon = isOpen ? IconChevronDown : IconChevronRight;

	function handleToggle() {
		onToggle(group.key);
	}

	function sourceTotal(stock: InventoryStock) {
		const total = stock.sourceOrderId
			? sourceTotals.get(stock.sourceOrderId)
			: undefined;

		return total?.firstStockId === stock.id ? total.quantity : undefined;
	}

	return (
		<>
			<TableRow
				className={styles.unpriced}
				data-unpriced-highlight={isUnpricedHighlighted}
			>
				<TableCell>
					<Button
						variant="ghost"
						size="sm"
						aria-expanded={isOpen}
						aria-label={`Партии: ${group.productName} · ${group.zoneName}`}
						onClick={handleToggle}
					>
						<ToggleIcon size={16} />
						<span>{group.productName}</span>
					</Button>
				</TableCell>
				<TableCell>{group.zoneName}</TableCell>
				<TableCell>
					<strong>{numberFormat.format(group.quantity)} шт.</strong>
				</TableCell>
				<TableCell>{formatReserved(group.reserved)}</TableCell>
				<TableCell>Партий: {group.rows.length}</TableCell>
				<TableCell>
					<StockLinks
						warehouseId={warehouse.id}
						productId={group.productId}
						orders={warehouse.orders}
					/>
				</TableCell>
			</TableRow>
			{isOpen &&
				group.rows.map((stock) => (
					<TableRow
						key={stock.id}
						className={styles.unpriced}
						data-unpriced-highlight={isUnpricedHighlighted}
					>
						<TableCell>
							<StockSource
								stock={stock}
								warehouseId={warehouse.id}
								order={
									stock.sourceOrderId
										? deliveries.get(stock.sourceOrderId)
										: undefined
								}
								total={sourceTotal(stock)}
							/>
						</TableCell>
						<TableCell>{stock.zoneName}</TableCell>
						<TableCell>{numberFormat.format(stock.quantity)} шт.</TableCell>
						<TableCell>
							{stock.reserved === undefined ? "—" : `${stock.reserved} шт.`}
						</TableCell>
						<TableCell>
							{stock.isExpired && <StatusBadge value="expired" />}
							<TableNote as="span">{stock.expires || "Без срока"}</TableNote>
						</TableCell>
						<TableCell>
							<TableActions>
								<IconButton
									label="Списать"
									icon={<IconTrash size={16} />}
									variant="destructive-outline"
									title={stock.writeOffBlockedReason}
									disabled={isPending || !stock.canWriteOff}
									onClick={() => onWriteOff(stock)}
								/>
							</TableActions>
						</TableCell>
					</TableRow>
				))}
		</>
	);
}
