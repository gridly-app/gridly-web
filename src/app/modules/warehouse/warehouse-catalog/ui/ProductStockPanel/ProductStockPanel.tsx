import {
	reservedQuantity,
	type Stock,
	stockZoneNames,
	type Warehouse,
} from "@/domain/warehouse";
import {
	ListFilters,
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/shared/ui/dataDisplay";
import { isAccessDenied } from "@/shared/http";
import { useWarehouseResources } from "@/ports/warehouse";
import { Feedback, RetryButton } from "@/shared/ui/feedback";
import { Select } from "@/shared/ui/forms";

interface ProductStockFilters {
	search: string;
	zone: string;
	status: string;
}

const numberFormat = new Intl.NumberFormat("ru-RU");
const statusOptions = [
	{ value: "all", label: "Все партии" },
	{ value: "reserved", label: "В резерве" },
	{ value: "expired", label: "Просрочено" },
];

function matchesStockStatus(item: Stock, status: string) {
	if (status === "all") return true;
	if (status === "reserved") return reservedQuantity(item) > 0;

	return item.isExpired === true;
}

export function ProductStockPanel({
	stock,
	warehouse,
	filters,
	onChange,
}: {
	stock: Stock[];
	warehouse: Warehouse;
	filters: ProductStockFilters;
	onChange: (filters: ProductStockFilters) => void;
}) {
	const map = useWarehouseResources(warehouse, ["map"]);
	const cells = isAccessDenied(map.error) ? undefined : map.data?.cells;
	const namedZone = cells && stockZoneNames(cells);
	const { search, status } = filters;
	const zone = cells ? filters.zone : "all";
	const showMapError = stock.length > 0 && !cells && Boolean(map.error);
	const loadingZones = stock.length > 0 && !cells && !map.error;

	function zoneName(item: Stock) {
		if (namedZone) return namedZone(item);

		return item.cell.startsWith("robot:") ? "На роботе" : `Ячейка ${item.cell}`;
	}

	const searchQuery = search.trim().toLowerCase();
	const zoneOptions = [
		{ value: "all", label: "Все зоны" },
		...[...new Set(stock.map(zoneName))].map((name) => ({
			value: name,
			label: name,
		})),
	];
	const activeCount = Number(zone !== "all") + Number(status !== "all");
	const emptyMessage = stock.length
		? "Нет партий по выбранным фильтрам и поиску."
		: "Партий этого товара на складе нет.";
	const searchField = {
		"aria-label": "Поиск по партиям",
		value: search,
		onChange: (value: string) => onChange({ ...filters, search: value }),
	};

	function matchesFilters(item: Stock) {
		const text =
			`${zoneName(item)} ${item.batchId ?? item.id} ${item.expires}`.toLowerCase();
		const matchesZone = zone === "all" || zoneName(item) === zone;

		return (
			matchesZone &&
			matchesStockStatus(item, status) &&
			text.includes(searchQuery)
		);
	}

	const visibleStock = stock.filter(matchesFilters);

	function handleZoneChange(value: string) {
		onChange({ ...filters, zone: value });
	}

	function handleStatusChange(value: string) {
		onChange({ ...filters, status: value });
	}

	function handleReset() {
		onChange({ ...filters, zone: "all", status: "all" });
	}

	return (
		<>
			{showMapError && (
				<Feedback tone="warning" action={<RetryButton onRetry={map.retry} />}>
					Не удалось загрузить названия зон.
				</Feedback>
			)}
			{loadingZones && (
				<Feedback tone="loading">Загружаем названия зон…</Feedback>
			)}
			{stock.length > 0 && (
				<ListFilters
					search={searchField}
					count={activeCount}
					onReset={handleReset}
				>
					<Select
						aria-label="Зона партии"
						disabled={!cells}
						value={zone}
						onValueChange={handleZoneChange}
						options={zoneOptions}
					/>
					<Select
						aria-label="Состояние партии"
						value={status}
						onValueChange={handleStatusChange}
						options={statusOptions}
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
								<TableCell>{numberFormat.format(item.quantity)} шт.</TableCell>
								<TableCell>
									{numberFormat.format(reservedQuantity(item))} шт.
								</TableCell>
								<TableCell>{item.expires || "Без срока"}</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			) : (
				<p>{emptyMessage}</p>
			)}
		</>
	);
}
