import type { Warehouse } from "@/entities/warehouse";
import { useWorkspaceMode } from "@/shared/auth";
import { warehousePath } from "@/shared/config";
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
import type { useInventoryPage } from "../../model/useInventoryPage";
import { StockLinks } from "./StockLinks";

export function ExpectedDeliveriesTable({
	warehouse,
	items,
	hiddenColumns,
}: {
	warehouse: Pick<Warehouse, "id" | "orders">;
	items: ReturnType<typeof useInventoryPage>["expectedProducts"];
	hiddenColumns: number[];
}) {
	const mode = useWorkspaceMode();
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
				{items.flatMap((item) =>
					item.incoming.deliveries.map((delivery) => (
						<TableRow key={`${item.id}-${delivery.orderId}`}>
							<TableCell>
								<strong>{item.name}</strong>
								<StockLinks
									warehouseId={warehouse.id}
									productId={item.id}
									orders={warehouse.orders}
								/>
							</TableCell>
							<TableCell>
								+{delivery.quantity.toLocaleString("ru-RU")} шт.
							</TableCell>
							<TableCell>
								<Link
									to={{
										pathname: warehousePath(mode, warehouse.id, "inbound"),
										search: new URLSearchParams({
											order: delivery.orderId,
										}).toString(),
									}}
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
					)),
				)}
			</TableBody>
		</Table>
	);
}
