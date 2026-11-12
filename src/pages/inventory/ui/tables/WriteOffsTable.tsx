import type { Warehouse } from "@/entities/warehouse";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/shared/ui/dataDisplay";
import type { useInventoryPage } from "../../model/useInventoryPage";
import { StockLinks } from "./StockLinks";
import stockTableStyles from "./StockTable.module.css";

export function WriteOffsTable({
	warehouse,
	items,
	hiddenColumns,
	highlightUnpriced,
}: {
	warehouse: Pick<Warehouse, "id" | "orders" | "timezone">;
	items: ReturnType<typeof useInventoryPage>["writeOffs"];
	hiddenColumns: number[];
	highlightUnpriced: boolean;
}) {
	return (
		<Table hiddenColumns={hiddenColumns}>
			<TableHeader>
				<TableRow>
					<TableHead>Товар</TableHead>
					<TableHead>Списано</TableHead>
					<TableHead>Стоимость</TableHead>
					<TableHead>Дата</TableHead>
					<TableHead>Причина</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{items.map((item) => (
					<TableRow
						key={item.id}
						className={stockTableStyles.unpriced}
						data-unpriced-highlight={highlightUnpriced}
					>
						<TableCell>
							{item.productName}
							<StockLinks
								warehouseId={warehouse.id}
								productId={item.product}
								orders={warehouse.orders}
							/>
						</TableCell>
						<TableCell>{item.quantity.toLocaleString("ru-RU")} шт.</TableCell>
						<TableCell>
							{item.price === null
								? "Не указана"
								: (item.price * item.quantity).toLocaleString("ru-RU", {
										style: "currency",
										currency: "RUB",
									})}
						</TableCell>
						<TableCell>
							{new Date(item.time).toLocaleDateString("ru-RU", {
								timeZone: warehouse.timezone,
							})}
						</TableCell>
						<TableCell>{item.reason}</TableCell>
					</TableRow>
				))}
			</TableBody>
		</Table>
	);
}
