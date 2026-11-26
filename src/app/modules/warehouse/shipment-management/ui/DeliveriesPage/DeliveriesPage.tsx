import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { formatUnit, shipmentTrackingSchema } from "@/domain/shipment";
import { orderValue } from "@/domain/warehouse";
import { shipmentManagementPath } from "@/ports/navigation";
import { useWorkspaceMode } from "@/ports/session";
import type { ShipmentProgressSlot } from "@/ports/shipment";
import { useWarehouseScopeId, useWarehouseScreen } from "@/ports/warehouse";
import { type HttpClient, isAccessDenied, parseResponse } from "@/shared/http";
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
import { type WorkingShipment } from "../../model/shipment.dto.ts";
import styles from "../../shared.module.css";

const quantity = new Intl.NumberFormat("ru-RU");
type DeliveryItem = Pick<
	WorkingShipment["items"][number],
	"order_line_id" | "sku" | "name" | "quantity" | "unit"
>;

export function DeliveriesPage({
	http,
	progress: ShipmentProgress,
}: {
	http: HttpClient;
	progress: ShipmentProgressSlot;
}) {
	const { warehouse } = useWarehouseScreen(["orders", "catalog"]);
	const mode = useWorkspaceMode();
	const [params, setParams] = useSearchParams();
	const { orders } = warehouse;
	const orderId = params.get("order");
	const selected = orderId
		? orders.find((order) => order.id === orderId)
		: (orders.find((order) => order.kind === "outbound") ?? orders[0]);
	const scopeId = useWarehouseScopeId();
	const query = useQuery({
		queryKey: [scopeId, "delivery", warehouse.id, selected?.id],
		queryFn: async ({ signal }) =>
			parseResponse(
				shipmentTrackingSchema,
				await http.request(
					`/warehouses/${encodeURIComponent(warehouse.id)}/orders/${encodeURIComponent(selected?.id ?? "")}/shipment`,
					{ signal },
				),
			),
		enabled: !!selected,
		retry: false,
		refetchInterval: 15000,
	});
	const tracking = isAccessDenied(query.error) ? undefined : query.data;
	const hasRefreshError = !!tracking && !!query.error;
	const cost = selected && orderValue(selected, warehouse.products);
	const items = tracking?.items?.length
		? tracking.items
		: (selected?.lines.map((line, index): DeliveryItem => {
				const product = warehouse.products.find(
					(item) => item.id === line.product,
				);
				return {
					order_line_id: line.id ?? String(index),
					sku: product?.sku ?? "",
					name: product?.name ?? line.product,
					quantity: line.quantity,
					unit: "pcs",
				};
			}) ?? []);
	const origin = tracking?.route?.origin_address?.trim();
	const destination = tracking?.route?.destination_address?.trim();
	return (
		<section className={styles.page} aria-labelledby="deliveries-heading">
			<h1 id="deliveries-heading">Доставки</h1>
			{orders.length > 0 && (
				<Select
					className={styles.deliverySelect}
					aria-label="Заказ на доставку"
					searchable={orders.length > 12}
					searchLabel="Найти заказ"
					value={selected?.id ?? ""}
					onValueChange={(id) => setParams({ order: id }, { replace: true })}
					options={orders.map((order) => ({
						value: order.id,
						label: `${order.number} · ${order.party}`,
					}))}
				/>
			)}
			{!selected && (
				<Feedback tone="empty">
					{orderId
						? "Заказ на доставку недоступен."
						: "У этого склада пока нет заказов на доставку."}
				</Feedback>
			)}
			{selected && query.isPending && (
				<Feedback tone="loading">Загружаем этапы доставки…</Feedback>
			)}
			{query.error && !hasRefreshError && (
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
				<>
					<section
						className={styles.deliveryCard}
						aria-labelledby="delivery-route-heading"
					>
						<h2 id="delivery-route-heading">Маршрут</h2>
						<DetailFacts className={styles.deliveryAddresses}>
							<DetailFact label="Адрес погрузки">
								{origin || "Адрес не указан"}
							</DetailFact>
							<DetailFact label="Адрес выгрузки">
								{destination || "Адрес не указан"}
							</DetailFact>
						</DetailFacts>
					</section>
					<ShipmentProgress shipment={tracking} kind={selected.kind} />
					<section
						className={styles.deliveryOrder}
						aria-labelledby="delivery-cost-heading"
					>
						<h2 id="delivery-cost-heading">Стоимость: {cost.label}</h2>
						<DeliveryOrderItems items={items} />
						{selected.kind === "outbound" && (
							<Link
								to={shipmentManagementPath(mode, warehouse.id, selected.id)}
							>
								Управление отгрузкой
							</Link>
						)}
					</section>
				</>
			)}
		</section>
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
							{quantity.format(item.quantity)} {formatUnit(item.unit)}
						</TableCell>
					</TableRow>
				))}
			</TableBody>
		</Table>
	);
}
