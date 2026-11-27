import type { WarehouseView } from "@/domain/warehouse";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/shared/ui/dataDisplay";

import type { WriteOffRow } from "../../model/inventoryRows";
import { StockLinks } from "../StockLinks/StockLinks";

import styles from "../../shared.module.css";

const numberFormat = new Intl.NumberFormat("ru-RU");
const moneyFormat = new Intl.NumberFormat("ru-RU", {
	style: "currency",
	currency: "RUB",
});

export function WriteOffsTable({
	warehouse,
	items,
	hiddenColumns,
	isUnpricedHighlighted,
}: {
	warehouse: Pick<WarehouseView<"orders">, "id" | "orders" | "timezone">;
	items: WriteOffRow[];
	hiddenColumns: number[];
	isUnpricedHighlighted: boolean;
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
				{items.map((item) => {
					const cost =
						item.price === null
							? "Не указана"
							: moneyFormat.format(item.price * item.quantity);

					return (
						<TableRow
							key={item.id}
							className={styles.unpriced}
							data-unpriced-highlight={isUnpricedHighlighted}
						>
							<TableCell>
								{item.productName}
								<StockLinks
									warehouseId={warehouse.id}
									productId={item.product}
									orders={warehouse.orders}
								/>
							</TableCell>
							<TableCell>{numberFormat.format(item.quantity)} шт.</TableCell>
							<TableCell>{cost}</TableCell>
							<TableCell>
								{new Date(item.time).toLocaleDateString("ru-RU", {
									timeZone: warehouse.timezone,
								})}
							</TableCell>
							<TableCell>{item.reason}</TableCell>
						</TableRow>
					);
				})}
			</TableBody>
		</Table>
	);
}
