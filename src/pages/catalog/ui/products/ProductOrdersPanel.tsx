import { type Order, StatusBadge, statusLabels } from "@/entities/warehouse";
import { useWorkspaceMode } from "@/shared/auth";
import { warehousePath } from "@/shared/config";
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

interface ProductOrderFilters {
	search: string;
	kind: string;
	status: string;
}

interface ProductOrdersPanelProps {
	productId: string;
	warehouseId: string;
	warehouseOrders: Order[];
	filters: ProductOrderFilters;
	onChange: (filters: ProductOrderFilters) => void;
}

const number = new Intl.NumberFormat("ru-RU");

export function ProductOrdersPanel({
	productId,
	warehouseId,
	warehouseOrders,
	filters,
	onChange,
}: ProductOrdersPanelProps) {
	const mode = useWorkspaceMode();
	const { search: orderSearch, kind: orderKind, status: orderStatus } = filters;
	const orders = warehouseOrders
		.flatMap((order) => {
			const lines = order.lines.filter((line) => line.product === productId);
			return lines.length
				? [
						{
							order,
							quantity: lines.reduce((sum, line) => sum + line.quantity, 0),
						},
					]
				: [];
		})
		.sort((a, b) => b.order.created.localeCompare(a.order.created));
	const visibleOrders = orders.filter(
		({ order }) =>
			(orderKind === "all" || order.kind === orderKind) &&
			(orderStatus === "all" || order.status === orderStatus) &&
			`${order.number} ${order.party}`
				.toLowerCase()
				.includes(orderSearch.trim().toLowerCase()),
	);
	return (
		<>
			{orders.length > 0 && (
				<ListFilters
					search={{
						"aria-label": "Поиск по заказам товара",
						value: orderSearch,
						onChange: (search) => onChange({ ...filters, search }),
					}}
					count={Number(orderKind !== "all") + Number(orderStatus !== "all")}
					onReset={() => onChange({ ...filters, kind: "all", status: "all" })}
				>
					<Select
						aria-label="Тип заказа"
						value={orderKind}
						onValueChange={(kind) => onChange({ ...filters, kind })}
						options={[
							{ value: "all", label: "Все заказы" },
							{ value: "inbound", label: "Поставки" },
							{ value: "outbound", label: "Отгрузки" },
						]}
					/>
					<Select
						aria-label="Статус заказа"
						value={orderStatus}
						onValueChange={(status) => onChange({ ...filters, status })}
						options={[
							{ value: "all", label: "Все статусы" },
							...[...new Set(orders.map(({ order }) => order.status))].map(
								(status) => ({
									value: status,
									label: statusLabels[status] ?? status,
								}),
							),
						]}
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
									<Link
										to={{
											pathname: warehousePath(mode, warehouseId, order.kind),
											search: new URLSearchParams({
												order: order.id,
											}).toString(),
										}}
									>
										{order.number}
									</Link>
								</TableCell>
								<TableCell>
									{order.kind === "inbound" ? "Поставка" : "Отгрузка"}
								</TableCell>
								<TableCell>{order.party}</TableCell>
								<TableCell>
									<StatusBadge value={order.status} />
								</TableCell>
								<TableCell>{number.format(quantity)} шт.</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			) : (
				<p>
					{orders.length
						? "Нет заказов по выбранным фильтрам и поиску."
						: "В доступном составе заказов этот товар не найден."}
				</p>
			)}
		</>
	);
}
