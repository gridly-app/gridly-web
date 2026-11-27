import type { WarehouseView } from "@/domain/warehouse";
import { useWorkspaceMode } from "@/ports/session";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableNote,
	TableRow,
} from "@/shared/ui/dataDisplay";
import { Link } from "@/shared/ui/navigation";
import { WarmTooltip } from "@/shared/ui/overlays";

import { orderLink } from "../../lib/orderLink";
import type { ExpectedProduct } from "../../model/inventoryRows";
import { StockLinks } from "../StockLinks/StockLinks";

const numberFormat = new Intl.NumberFormat("ru-RU");

export function ExpectedDeliveriesTable({
	warehouse,
	items,
	hiddenColumns,
}: {
	warehouse: Pick<WarehouseView<"orders">, "id" | "orders">;
	items: ExpectedProduct[];
	hiddenColumns: number[];
}) {
	const mode = useWorkspaceMode();
	const rows = items.flatMap((item) =>
		item.incoming.deliveries.map((delivery) => ({ item, delivery })),
	);

	return (
		<Table hiddenColumns={hiddenColumns}>
			<TableHeader>
				<TableRow>
					<TableHead>Товар</TableHead>
					<TableHead>Ожидается</TableHead>
					<TableHead>Поставка / поставщик</TableHead>
					<TableHead>Срок</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{rows.map(({ item, delivery }) => (
					<TableRow key={`${item.id}-${delivery.orderId}`}>
						<TableCell>
							<strong>{item.name}</strong>
							<StockLinks
								warehouseId={warehouse.id}
								productId={item.id}
								orders={warehouse.orders}
							/>
						</TableCell>
						<TableCell>+{numberFormat.format(delivery.quantity)} шт.</TableCell>
						<TableCell>
							<Link
								to={orderLink(mode, warehouse.id, "inbound", delivery.orderId)}
							>
								{delivery.orderNumber}
							</Link>
							<TableNote>{delivery.party}</TableNote>
						</TableCell>
						<TableCell>
							<WarmTooltip content={delivery.forecast.note} focusable>
								<span>{delivery.label}</span>
							</WarmTooltip>
						</TableCell>
					</TableRow>
				))}
			</TableBody>
		</Table>
	);
}
