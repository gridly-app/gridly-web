import { type Cell, type Stock, stockZoneNames } from "@/entities/warehouse";
import {
	ListFilters,
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/shared/ui/dataDisplay";
import { Select } from "@/shared/ui/forms";

interface ProductStockFilters {
	search: string;
	zone: string;
	status: string;
}

interface ProductStockPanelProps {
	stock: Stock[];
	cells: Cell[];
	filters: ProductStockFilters;
	onChange: (filters: ProductStockFilters) => void;
}

const number = new Intl.NumberFormat("ru-RU");

export function ProductStockPanel({
	stock,
	cells,
	filters,
	onChange,
}: ProductStockPanelProps) {
	const { search: stockSearch, zone, status: stockFilter } = filters;
	const zoneName = stockZoneNames(cells);
	const zones = [...new Set(stock.map(zoneName))];
	const visibleStock = stock.filter(
		(item) =>
			(zone === "all" || zoneName(item) === zone) &&
			(stockFilter === "all" ||
				(stockFilter === "reserved"
					? (item.reserved ?? 0) > 0
					: item.isExpired === true)) &&
			`${zoneName(item)} ${item.batchId ?? item.id} ${item.expires}`
				.toLowerCase()
				.includes(stockSearch.trim().toLowerCase()),
	);
	return (
		<>
			{stock.length > 0 && (
				<ListFilters
					search={{
						"aria-label": "Поиск по партиям",
						value: stockSearch,
						onChange: (search) => onChange({ ...filters, search }),
					}}
					count={Number(zone !== "all") + Number(stockFilter !== "all")}
					onReset={() => onChange({ ...filters, zone: "all", status: "all" })}
				>
					<Select
						aria-label="Зона партии"
						value={zone}
						onValueChange={(zone) => onChange({ ...filters, zone })}
						options={[
							{ value: "all", label: "Все зоны" },
							...zones.map((name) => ({ value: name, label: name })),
						]}
					/>
					<Select
						aria-label="Состояние партии"
						value={stockFilter}
						onValueChange={(status) => onChange({ ...filters, status })}
						options={[
							{ value: "all", label: "Все партии" },
							{ value: "reserved", label: "В резерве" },
							{ value: "expired", label: "Просрочено" },
						]}
					/>
				</ListFilters>
			)}
			{visibleStock.length ? (
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Зона</TableHead>
							<TableHead>Количество</TableHead>
							<TableHead>В резерве</TableHead>
							<TableHead>Срок годности</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{visibleStock.map((item) => (
							<TableRow key={item.id}>
								<TableCell>{zoneName(item)}</TableCell>
								<TableCell>{number.format(item.quantity)} шт.</TableCell>
								<TableCell>{number.format(item.reserved ?? 0)} шт.</TableCell>
								<TableCell>{item.expires || "Без срока"}</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			) : (
				<p>
					{stock.length
						? "Нет партий по выбранным фильтрам и поиску."
						: "Партий этого товара на складе нет."}
				</p>
			)}
		</>
	);
}
