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
import type { getOrderPresentation } from "../../model/getOrderPresentation";
import styles from "./OrderLinesTable.module.css";

export type OrderLine = ReturnType<
	typeof getOrderPresentation
>["lines"][number];

const number = new Intl.NumberFormat("ru-RU");
const money = new Intl.NumberFormat("ru-RU", {
	style: "currency",
	currency: "RUB",
});

interface OrderLinesTableProps {
	warehouseId: string;
	visible: { line: OrderLine; index: number }[];
	showProgress: boolean;
	hiddenColumns: readonly number[] | undefined;
	unpriced: boolean;
	category: string;
}

export function OrderLinesTable({
	warehouseId,
	visible,
	showProgress,
	hiddenColumns,
	unpriced,
	category,
}: OrderLinesTableProps) {
	const mode = useWorkspaceMode();
	const catalogPath = warehousePath(mode, warehouseId, "catalog");
	const inventoryPath = warehousePath(mode, warehouseId, "inventory");

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
					{showProgress && <TableHead>Размещено / списано</TableHead>}
					<TableHead>Остатки</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{visible.map(({ line, index }) => (
					<TableRow
						key={line.id || index}
						className={styles.unpriced}
						data-unpriced-highlight={
							unpriced &&
							line.unpriced &&
							(category === "all" || line.category === category)
						}
					>
						<TableCell>
							{line.sku !== undefined ? (
								<Link
									to={{
										pathname: catalogPath,
										search: new URLSearchParams({
											product: line.product,
										}).toString(),
									}}
								>
									{line.productName}
								</Link>
							) : (
								<strong>{line.productName}</strong>
							)}
							{line.sku && <TableNote>{line.sku}</TableNote>}
						</TableCell>
						<TableCell>{number.format(line.quantity)} шт.</TableCell>
						<TableCell>
							{line.processed === null
								? "—"
								: `${number.format(line.processed)} шт.`}
						</TableCell>
						<TableCell>
							{line.remaining === null
								? "—"
								: `${number.format(line.remaining)} шт.`}
						</TableCell>
						<TableCell>{line.expires || "Без срока"}</TableCell>
						<TableCell>
							{line.unitPrice === null
								? "Без цены"
								: money.format(line.unitPrice * line.quantity)}
						</TableCell>
						{showProgress && (
							<TableCell>
								{line.putaway === undefined && line.writtenOff === undefined
									? "—"
									: `${number.format(line.putaway ?? 0)} / ${number.format(line.writtenOff ?? 0)}`}
							</TableCell>
						)}
						<TableCell>
							<Link
								to={{
									pathname: inventoryPath,
									search: new URLSearchParams({
										product: line.product,
									}).toString(),
								}}
							>
								Партии товара
							</Link>
						</TableCell>
					</TableRow>
				))}
			</TableBody>
		</Table>
	);
}
