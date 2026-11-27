import { warehousePath } from "@/ports/navigation";
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

import type { getOrderPresentation } from "../../model/getOrderPresentation";

import styles from "./OrderLinesTable.module.css";

export type OrderLine = ReturnType<
	typeof getOrderPresentation
>["lines"][number];

const numberFormat = new Intl.NumberFormat("ru-RU");
const moneyFormat = new Intl.NumberFormat("ru-RU", {
	style: "currency",
	currency: "RUB",
});

function formatPieces(value: number | null) {
	return value === null ? "—" : `${numberFormat.format(value)} шт.`;
}

function formatProgress(line: OrderLine) {
	if (line.putaway === undefined && line.writtenOff === undefined) return "—";

	return `${numberFormat.format(line.putaway ?? 0)} / ${numberFormat.format(line.writtenOff ?? 0)}`;
}

export function OrderLinesTable({
	warehouseId,
	visible,
	hasProgress,
	hiddenColumns,
	isUnpricedHighlighted,
	category,
}: {
	warehouseId: string;
	visible: { line: OrderLine; index: number }[];
	hasProgress: boolean;
	hiddenColumns: readonly number[] | undefined;
	isUnpricedHighlighted: boolean;
	category: string;
}) {
	const mode = useWorkspaceMode();
	const catalogPath = warehousePath(mode, warehouseId, "catalog");
	const inventoryPath = warehousePath(mode, warehouseId, "inventory");

	function productLink(pathname: string, productId: string) {
		return {
			pathname,
			search: new URLSearchParams({ product: productId }).toString(),
		};
	}

	return (
		<Table hiddenColumns={hiddenColumns}>
			<TableHeader>
				<TableRow>
					<TableHead>Товар</TableHead>
					<TableHead>Заказано</TableHead>
					<TableHead>Обработано</TableHead>
					<TableHead>Осталось</TableHead>
					<TableHead>Срок годности</TableHead>
					<TableHead>Стоимость</TableHead>
					{hasProgress && <TableHead>Размещено / списано</TableHead>}
					<TableHead>Остатки</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{visible.map(({ line, index }) => {
					const isInCategory = category === "all" || line.category === category;
					const isHighlighted =
						isUnpricedHighlighted && line.unpriced && isInCategory;
					const cost =
						line.unitPrice === null
							? "Без цены"
							: moneyFormat.format(line.unitPrice * line.quantity);

					return (
						<TableRow
							key={line.id || index}
							className={styles.unpriced}
							data-unpriced-highlight={isHighlighted}
						>
							<TableCell>
								{line.sku !== undefined ? (
									<Link to={productLink(catalogPath, line.product)}>
										{line.productName}
									</Link>
								) : (
									<strong>{line.productName}</strong>
								)}
								{line.sku && <TableNote>{line.sku}</TableNote>}
							</TableCell>
							<TableCell>{formatPieces(line.quantity)}</TableCell>
							<TableCell>{formatPieces(line.processed)}</TableCell>
							<TableCell>{formatPieces(line.remaining)}</TableCell>
							<TableCell>{line.expires || "Без срока"}</TableCell>
							<TableCell>{cost}</TableCell>
							{hasProgress && <TableCell>{formatProgress(line)}</TableCell>}
							<TableCell>
								<Link to={productLink(inventoryPath, line.product)}>
									Партии товара
								</Link>
							</TableCell>
						</TableRow>
					);
				})}
			</TableBody>
		</Table>
	);
}
