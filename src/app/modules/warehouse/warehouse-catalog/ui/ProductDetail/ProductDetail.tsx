import { type ReactNode, useState } from "react";

import type {
	Product,
	ProductInput,
	WarehouseResource,
} from "@/domain/warehouse";
import {
	StatusBadge,
	useWarehouseResources,
	type WarehouseResources,
} from "@/ports/warehouse";
import { isAccessDenied } from "@/shared/http";
import { Button } from "@/shared/ui/controls";
import { Feedback, RetryButton } from "@/shared/ui/feedback";
import { SegmentedControl } from "@/shared/ui/navigation";
import { Modal } from "@/shared/ui/overlays";

import type { CatalogWarehouse } from "../../model/warehouseResources";
import { ProductFacts } from "../ProductFacts/ProductFacts";
import { ProductForm } from "../ProductForm/ProductForm";
import { ProductMovements } from "../ProductMovements/ProductMovements";
import { ProductOrdersPanel } from "../ProductOrdersPanel/ProductOrdersPanel";
import { ProductStockPanel } from "../ProductStockPanel/ProductStockPanel";

import styles from "./ProductDetail.module.css";

type ProductTab = "stock" | "orders" | "movements";

const orderResources = ["orders"] as const;
const movementResources = ["orders", "history"] as const;

export function ProductDetail({
	product,
	warehouse,
	isPending,
	onSave,
	onClose,
}: {
	product: Product;
	warehouse: CatalogWarehouse;
	isPending: boolean;
	onSave: (product: ProductInput) => Promise<void>;
	onClose: () => void;
}) {
	const [tab, setTab] = useState<ProductTab>("stock");
	const [isEditing, setIsEditing] = useState(false);
	const [stockFilters, setStockFilters] = useState({
		search: "",
		zone: "all",
		status: "all",
	});
	const [orderFilters, setOrderFilters] = useState({
		search: "",
		kind: "all",
		status: "all",
	});
	const canEdit = Boolean(product.allowedActions?.includes("edit"));
	const stock = warehouse.stock.filter((item) => item.product === product.id);
	const category = warehouse.categories.find(
		(item) => item.id === product.category,
	);
	const subtitle = [product.sku, category?.name].filter(Boolean).join(" · ");
	const tabItems = [
		{ value: "stock", label: `Партии · ${stock.length}` },
		{ value: "orders", label: "Заказы" },
		{ value: "movements", label: "Движения" },
	] as const;

	function handleStartEditing() {
		setIsEditing(true);
	}

	function handleStopEditing() {
		setIsEditing(false);
	}

	async function handleSave(input: ProductInput) {
		await onSave(input);
		setIsEditing(false);
	}

	if (isEditing && canEdit) {
		return (
			<Modal title="Редактирование товара" wide onClose={onClose}>
				<Button variant="ghost" onClick={handleStopEditing}>
					К карточке товара
				</Button>
				<ProductForm
					product={product}
					categories={warehouse.categories}
					isPending={isPending}
					onSave={handleSave}
				/>
			</Modal>
		);
	}

	return (
		<Modal title={product.name} wide onClose={onClose}>
			<div className={styles.header}>
				<p>{subtitle}</p>
				{product.archived && <StatusBadge value="Архив" />}
				{canEdit && (
					<Button
						variant="secondary"
						disabled={isPending}
						onClick={handleStartEditing}
					>
						Изменить товар
					</Button>
				)}
			</div>
			<ProductFacts product={product} stock={stock} />
			<SegmentedControl
				aria-label="Данные о товаре"
				value={tab}
				onValueChange={setTab}
				items={tabItems}
			/>
			{tab === "stock" && (
				<ProductStockPanel
					warehouse={warehouse}
					stock={stock}
					filters={stockFilters}
					onChange={setStockFilters}
				/>
			)}
			{tab === "orders" && (
				<ProductTabResources warehouse={warehouse} resources={orderResources}>
					{(details) => (
						<ProductOrdersPanel
							warehouseId={warehouse.id}
							warehouseOrders={details.orders}
							productId={product.id}
							filters={orderFilters}
							onChange={setOrderFilters}
						/>
					)}
				</ProductTabResources>
			)}
			{tab === "movements" && (
				<ProductTabResources
					warehouse={warehouse}
					resources={movementResources}
				>
					{(details) => (
						<ProductMovements productId={product.id} warehouse={details} />
					)}
				</ProductTabResources>
			)}
		</Modal>
	);
}

function ProductTabResources<Resource extends WarehouseResource>({
	warehouse,
	resources,
	children,
}: {
	warehouse: CatalogWarehouse;
	resources: readonly Resource[];
	children: (
		data: NonNullable<WarehouseResources<CatalogWarehouse, Resource>["data"]>,
	) => ReactNode;
}) {
	const details = useWarehouseResources(warehouse, resources);
	const data = isAccessDenied(details.error) ? undefined : details.data;
	const errorTone = data ? "warning" : "error";
	const isLoading = !data && details.loading;

	return (
		<>
			{details.error && (
				<Feedback
					tone={errorTone}
					action={<RetryButton variant="secondary" onRetry={details.retry} />}
				>
					Не удалось обновить данные карточки.
				</Feedback>
			)}
			{isLoading && <Feedback tone="loading">Загружаем данные…</Feedback>}
			{data && children(data)}
		</>
	);
}
