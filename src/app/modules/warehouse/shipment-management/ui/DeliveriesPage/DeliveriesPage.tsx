import { useSearchParams } from "react-router-dom";

import { formatUnit } from "@/domain/shipment";
import { type Order, orderValue } from "@/domain/warehouse";
import { shipmentManagementPath } from "@/ports/navigation";
import { useWorkspaceMode } from "@/ports/session";
import type { ShipmentProgressSlot } from "@/ports/shipment";
import { useWarehouseScreen } from "@/ports/warehouse";
import { type HttpClient, isAccessDenied } from "@/shared/http";
import { errorMessage } from "@/shared/lib";
import {
	DetailFact,
	DetailFacts,
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/shared/ui/dataDisplay";
import { Feedback, RetryButton } from "@/shared/ui/feedback";
import { Select } from "@/shared/ui/forms";
import { Link } from "@/shared/ui/navigation";

import {
	type DeliveryTracking,
	useDeliveryTracking,
} from "../../api/useDeliveryTracking";
import {
	type DeliveryItem,
	orderDeliveryItems,
} from "../../model/deliveryItems";

import styles from "../../shared.module.css";

const quantityFormat = new Intl.NumberFormat("ru-RU");
const searchableOrderCount = 12;

function defaultOrder(orders: Order[]) {
	return orders.find((order) => order.kind === "outbound") ?? orders[0];
}

export function DeliveriesPage({
	http,
	progress,
}: {
	http: HttpClient;
	progress: ShipmentProgressSlot;
}) {
	const { warehouse } = useWarehouseScreen(["orders", "catalog"]);
	const [params, setParams] = useSearchParams();
	const { orders } = warehouse;
	const orderId = params.get("order");
	const selected = orderId
		? orders.find((order) => order.id === orderId)
		: defaultOrder(orders);
	const query = useDeliveryTracking(http, warehouse.id, selected?.id);
	const tracking = isAccessDenied(query.error) ? undefined : query.data;
	const hasRefreshError = Boolean(tracking) && Boolean(query.error);
	const hasLoadError = Boolean(query.error) && !hasRefreshError;
	const cost = selected && orderValue(selected, warehouse.products);
	const emptyMessage = orderId
		? "Заказ на доставку недоступен."
		: "У этого склада пока нет заказов на доставку.";
	const orderOptions = orders.map((order) => ({
		value: order.id,
		label: `${order.number} · ${order.party}`,
	}));

	function handleOrderChange(id: string) {
		setParams({ order: id }, { replace: true });
	}

	return (
		<section className={styles.page} aria-labelledby="deliveries-heading">
			<h1 id="deliveries-heading">Доставки</h1>
			{orders.length > 0 && (
				<Select
					className={styles.deliverySelect}
					aria-label="Заказ на доставку"
					searchable={orders.length > searchableOrderCount}
					searchLabel="Найти заказ"
					value={selected?.id ?? ""}
					onValueChange={handleOrderChange}
					options={orderOptions}
				/>
			)}
			{!selected && <Feedback tone="empty">{emptyMessage}</Feedback>}
			{selected && query.isPending && (
				<Feedback tone="loading">Загружаем этапы доставки…</Feedback>
			)}
			{hasLoadError && (
				<Feedback
					tone="error"
					title="Не удалось загрузить этапы доставки"
					action={<RetryButton onRetry={query.refetch} />}
				>
					{errorMessage(query.error)}
				</Feedback>
			)}
			{hasRefreshError && (
				<Feedback
					tone="warning"
					action={<RetryButton onRetry={query.refetch} />}
				>
					Не удалось обновить данные. Показаны последние загруженные данные.
				</Feedback>
			)}
			{selected && cost && tracking && (
				<DeliveryDetails
					order={selected}
					costLabel={cost.label}
					tracking={tracking}
					items={
						tracking.items?.length
							? tracking.items
							: orderDeliveryItems(selected, warehouse.products)
					}
					warehouseId={warehouse.id}
					progress={progress}
				/>
			)}
		</section>
	);
}

function DeliveryDetails({
	order,
	costLabel,
	tracking,
	items,
	warehouseId,
	progress: ShipmentProgress,
}: {
	order: Order;
	costLabel: string;
	tracking: DeliveryTracking;
	items: DeliveryItem[];
	warehouseId: string;
	progress: ShipmentProgressSlot;
}) {
	const mode = useWorkspaceMode();
	const origin = tracking.route?.origin_address?.trim() || "Адрес не указан";
	const destination =
		tracking.route?.destination_address?.trim() || "Адрес не указан";

	return (
		<>
			<section
				className={styles.deliveryCard}
				aria-labelledby="delivery-route-heading"
			>
				<h2 id="delivery-route-heading">Маршрут</h2>
				<DetailFacts className={styles.deliveryAddresses}>
					<DetailFact label="Адрес погрузки">{origin}</DetailFact>
					<DetailFact label="Адрес выгрузки">{destination}</DetailFact>
				</DetailFacts>
			</section>
			<ShipmentProgress shipment={tracking} kind={order.kind} />
			<section
				className={styles.deliveryOrder}
				aria-labelledby="delivery-cost-heading"
			>
				<h2 id="delivery-cost-heading">Стоимость: {costLabel}</h2>
				<DeliveryOrderItems items={items} />
				{order.kind === "outbound" && (
					<Link to={shipmentManagementPath(mode, warehouseId, order.id)}>
						Управление отгрузкой
					</Link>
				)}
			</section>
		</>
	);
}

function DeliveryOrderItems({ items }: { items: DeliveryItem[] }) {
	if (!items.length) return <p>Состав заказа не указан.</p>;

	return (
		<Table aria-label="Состав заказа">
			<TableHeader>
				<TableRow>
					<TableHead>Товар</TableHead>
					<TableHead>Артикул</TableHead>
					<TableHead>Количество</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{items.map((item) => (
					<TableRow key={item.order_line_id}>
						<TableCell>{item.name}</TableCell>
						<TableCell>{item.sku || "—"}</TableCell>
						<TableCell>
							{quantityFormat.format(item.quantity)} {formatUnit(item.unit)}
						</TableCell>
					</TableRow>
				))}
			</TableBody>
		</Table>
	);
}
