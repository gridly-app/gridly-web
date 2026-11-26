import type { Order } from "@/domain/warehouse";
import { warehousePath } from "@/ports/navigation";
import { useWorkspaceMode } from "@/ports/session";
import { useOrder } from "@/ports/warehouse";
import { TableNote } from "@/shared/ui/dataDisplay";
import { Link } from "@/shared/ui/navigation";

import type { InventoryStock } from "../../model/inventoryStock";

import styles from "./StockSource.module.css";

export function StockSource({
	stock,
	warehouseId,
	order,
	total,
}: {
	stock: InventoryStock;
	warehouseId: string;
	order: Order | undefined;
	total: number | undefined;
}) {
	const mode = useWorkspaceMode();
	const knownSource = stock.sourceOrder ?? order;
	const query = useOrder(
		warehouseId,
		knownSource ? null : (stock.sourceOrderId ?? null),
	);
	const fetched = query.error ? undefined : query.data;
	const source =
		knownSource ?? (fetched?.kind === "inbound" ? fetched : undefined);

	if (!stock.sourceOrderId)
		return <span className={styles.source}>Поставка не указана</span>;
	if (!source && query.isPending)
		return <span className={styles.source}>Загружаем поставку…</span>;
	if (!source)
		return <span className={styles.source}>Поставка недоступна</span>;

	const path = warehousePath(mode, warehouseId, "inbound");
	const search = new URLSearchParams({ order: source.id }).toString();
	const showTotal = total !== undefined && total > stock.quantity;

	return (
		<div className={styles.source}>
			<Link to={{ pathname: path, search }}>Поставка {source.number}</Link>
			<TableNote>{source.party}</TableNote>
			{showTotal && (
				<TableNote>
					Всего от поставки: {total.toLocaleString("ru-RU")} шт.
				</TableNote>
			)}
		</div>
	);
}
