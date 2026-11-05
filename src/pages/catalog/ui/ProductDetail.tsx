import { useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import {
	type Product,
	type ProductInput,
	productOccupancy,
	productPrice,
	StatusBadge,
	statusLabels,
	stockZoneNames,
	useWarehouseResources,
	type Warehouse,
} from "@/entities/warehouse";
import { useWorkspaceMode } from "@/shared/auth";
import { warehousePath } from "@/shared/config";
import {
	Button,
	Feedback,
	Link,
	ListFilters,
	Modal,
	SegmentedControl,
	Select,
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/shared/ui";
import { ProductForm } from "./ProductForm";
import { ProductMovements } from "./ProductMovements";

const number = new Intl.NumberFormat("ru-RU");
const money = new Intl.NumberFormat("ru-RU", {
	style: "currency",
	currency: "RUB",
});

export function ProductDetail({
	product,
	warehouse,
	pending,
	onSave,
	onClose,
}: {
	product: Product;
	warehouse: Warehouse;
	pending: boolean;
	onSave: (product: ProductInput) => Promise<void>;
	onClose: () => void;
}) {
	const mode = useWorkspaceMode();
	const [tab, setTab] = useState<"stock" | "orders" | "movements">("stock");
	const [editing, setEditing] = useState(false);
	const [stockSearch, setStockSearch] = useState("");
	const [zone, setZone] = useState("all");
	const [stockFilter, setStockFilter] = useState("all");
	const [orderSearch, setOrderSearch] = useState("");
	const [orderKind, setOrderKind] = useState("all");
	const [orderStatus, setOrderStatus] = useState("all");
	const canEdit = product.allowedActions?.includes("edit");
	const stock = warehouse.stock.filter((item) => item.product === product.id);
	const occupancy = productOccupancy(product, stock);
	const reserved = stock.reduce((sum, item) => sum + (item.reserved ?? 0), 0);
	const category = warehouse.categories.find(
		(item) => item.id === product.category,
	);
	const price = productPrice(product.price);
	const details = useWarehouseResources(
		warehouse,
		editing
			? []
			: tab === "stock"
				? ["map"]
				: tab === "orders"
					? ["orders"]
					: ["orders", "history"],
	);
	const zoneName = stockZoneNames(details.warehouse.cells);
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
	const orders = details.warehouse.orders
		.flatMap((order) => {
			const lines = order.lines.filter((line) => line.product === product.id);
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
		<Modal
			title={editing && canEdit ? "Редактирование товара" : product.name}
			wide
			onClose={onClose}
		>
			{editing && canEdit ? (
				<>
					<Button variant="ghost" onClick={() => setEditing(false)}>
						К карточке товара
					</Button>
					<ProductForm
						product={product}
						categories={warehouse.categories}
						pending={pending}
						onSave={async (input) => {
							await onSave(input);
							setEditing(false);
						}}
					/>
				</>
			) : (
				<>
					<div className="flex flex-wrap items-center justify-between gap-2">
						<p>{[product.sku, category?.name].filter(Boolean).join(" · ")}</p>
						{product.archived && <StatusBadge value="Архив" />}
						{canEdit && (
							<Button
								variant="secondary"
								disabled={pending}
								onClick={() => setEditing(true)}
							>
								Изменить товар
							</Button>
						)}
					</div>
					<dl className="order-facts product-facts">
						<div>
							<dt>На складе</dt>
							<dd>{number.format(occupancy.quantity)} шт.</dd>
						</div>
						<div>
							<dt>В резерве</dt>
							<dd>{number.format(reserved)} шт.</dd>
						</div>
						<div>
							<dt>Занято на складе</dt>
							<dd>
								{occupancy.volume === null
									? "—"
									: `${number.format(occupancy.volume)} м³`}
							</dd>
						</div>
						<div>
							<dt>Цена за единицу</dt>
							<dd>{price === null ? "Не указана" : money.format(price)}</dd>
						</div>
						<div>
							<dt>Объём единицы</dt>
							<dd>{product.volume} м³</dd>
						</div>
						<div>
							<dt>Типовой срок годности</dt>
							<dd>
								{product.shelf
									? `${number.format(product.shelf)} дн.`
									: "Без срока"}
							</dd>
						</div>
					</dl>
					<SegmentedControl
						aria-label="Данные о товаре"
						value={tab}
						onValueChange={setTab}
						items={[
							{ value: "stock", label: `Партии · ${stock.length}` },
							{ value: "orders", label: "Заказы" },
							{ value: "movements", label: "Движения" },
						]}
					/>
					{tab === "stock" && stock.length > 0 && (
						<ListFilters
							search={{
								"aria-label": "Поиск по партиям",
								value: stockSearch,
								onChange: setStockSearch,
							}}
							count={Number(zone !== "all") + Number(stockFilter !== "all")}
							onReset={() => {
								setZone("all");
								setStockFilter("all");
							}}
						>
							<Select
								aria-label="Зона партии"
								value={zone}
								onValueChange={setZone}
								options={[
									{ value: "all", label: "Все зоны" },
									...zones.map((name) => ({ value: name, label: name })),
								]}
							/>
							<Select
								aria-label="Состояние партии"
								value={stockFilter}
								onValueChange={setStockFilter}
								options={[
									{ value: "all", label: "Все партии" },
									{ value: "reserved", label: "В резерве" },
									{ value: "expired", label: "Просрочено" },
								]}
							/>
						</ListFilters>
					)}
					{tab === "stock" &&
						(visibleStock.length ? (
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
											<TableCell>
												{number.format(item.reserved ?? 0)} шт.
											</TableCell>
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
						))}
					{tab !== "stock" && details.loading && (
						<Feedback tone="loading">Загружаем данные…</Feedback>
					)}
					{details.error && (
						<Feedback
							tone={details.hasData ? "warning" : "error"}
							action={
								<Button
									variant="secondary"
									onClick={() => {
										void details.retry();
									}}
								>
									Повторить
								</Button>
							}
						>
							Не удалось обновить данные карточки.
						</Feedback>
					)}
					{tab === "orders" && details.hasData && orders.length > 0 && (
						<ListFilters
							search={{
								"aria-label": "Поиск по заказам товара",
								value: orderSearch,
								onChange: setOrderSearch,
							}}
							count={
								Number(orderKind !== "all") + Number(orderStatus !== "all")
							}
							onReset={() => {
								setOrderKind("all");
								setOrderStatus("all");
							}}
						>
							<Select
								aria-label="Тип заказа"
								value={orderKind}
								onValueChange={setOrderKind}
								options={[
									{ value: "all", label: "Все заказы" },
									{ value: "inbound", label: "Поставки" },
									{ value: "outbound", label: "Отгрузки" },
								]}
							/>
							<Select
								aria-label="Статус заказа"
								value={orderStatus}
								onValueChange={setOrderStatus}
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
					{tab === "orders" &&
						details.hasData &&
						(visibleOrders.length ? (
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
													render={
														<RouterLink
															to={{
																pathname: warehousePath(
																	mode,
																	warehouse.id,
																	order.kind,
																),
																search: new URLSearchParams({
																	order: order.id,
																}).toString(),
															}}
														/>
													}
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
						))}
					{tab === "movements" && details.hasData && (
						<ProductMovements
							productId={product.id}
							warehouse={details.warehouse}
						/>
					)}
				</>
			)}
		</Modal>
	);
}
