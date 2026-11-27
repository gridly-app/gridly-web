import { type Order, statusLabels } from "@/domain/warehouse";
import { warehousePath } from "@/ports/navigation";
import { useWorkspaceMode } from "@/ports/session";
import { StatusBadge } from "@/ports/warehouse";
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
import { Link } from "@/shared/ui/navigation";

import { productOrders } from "../../model/productMovements";

interface ProductOrderFilters {
	search: string;
	kind: string;
	status: string;
}

const numberFormat = new Intl.NumberFormat("ru-RU");
const kindOptions = [
	{ value: "all", label: "Все заказы" },
	{ value: "inbound", label: "Поставки" },
	{ value: "outbound", label: "Отгрузки" },
];

function matchesOrder(
	order: Order,
	{ search, kind, status }: ProductOrderFilters,
) {
	const text = `${order.number} ${order.party}`.toLowerCase();
	const matchesKind = kind === "all" || order.kind === kind;
	const matchesStatus = status === "all" || order.status === status;

	return (
		matchesKind && matchesStatus && text.includes(search.trim().toLowerCase())
	);
}

export function ProductOrdersPanel({
	productId,
	warehouseId,
	warehouseOrders,
	filters,
	onChange,
}: {
	productId: string;
	warehouseId: string;
	warehouseOrders: Order[];
	filters: ProductOrderFilters;
	onChange: (filters: ProductOrderFilters) => void;
}) {
	const mode = useWorkspaceMode();
	const orders = productOrders(warehouseOrders, productId);
	const visibleOrders = orders.filter(({ order }) =>
		matchesOrder(order, filters),
	);
	const statuses = [...new Set(orders.map(({ order }) => order.status))];
	const statusOptions = [
		{ value: "all", label: "Все статусы" },
		...statuses.map((status) => ({
			value: status,
			label: statusLabels[status] ?? status,
		})),
	];
	const activeCount =
		Number(filters.kind !== "all") + Number(filters.status !== "all");
	const emptyMessage = orders.length
		? "Нет заказов по выбранным фильтрам и поиску."
		: "В доступном составе заказов этот товар не найден.";
	const searchField = {
		"aria-label": "Поиск по заказам товара",
		value: filters.search,
		onChange: (search: string) => onChange({ ...filters, search }),
	};

	function handleKindChange(kind: string) {
		onChange({ ...filters, kind });
	}

	function handleStatusChange(status: string) {
		onChange({ ...filters, status });
	}

	function handleReset() {
		onChange({ ...filters, kind: "all", status: "all" });
	}

	function orderLink(order: Order) {
		return {
			pathname: warehousePath(mode, warehouseId, order.kind),
			search: new URLSearchParams({ order: order.id }).toString(),
		};
	}

	return (
		<>
			{orders.length > 0 && (
				<ListFilters
					search={searchField}
					count={activeCount}
					onReset={handleReset}
				>
					<Select
						aria-label="Тип заказа"
						value={filters.kind}
						onValueChange={handleKindChange}
						options={kindOptions}
					/>
					<Select
						aria-label="Статус заказа"
						value={filters.status}
						onValueChange={handleStatusChange}
						options={statusOptions}
					/>
				</ListFilters>
			)}
			{visibleOrders.length ? (
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Заказ</TableHead>
							<TableHead>Тип</TableHead>
							<TableHead>Контрагент</TableHead>
							<TableHead>Статус</TableHead>
							<TableHead>Количество</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{visibleOrders.map(({ order, quantity }) => (
							<TableRow key={order.id}>
								<TableCell>
									<Link to={orderLink(order)}>{order.number}</Link>
								</TableCell>
								<TableCell>
									{order.kind === "inbound" ? "Поставка" : "Отгрузка"}
								</TableCell>
								<TableCell>{order.party}</TableCell>
								<TableCell>
									<StatusBadge value={order.status} />
								</TableCell>
								<TableCell>{numberFormat.format(quantity)} шт.</TableCell>
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
