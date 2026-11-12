import { useState } from "react";
import {
	type Product,
	type ProductInput,
	StatusBadge,
	useWarehouseResources,
	type Warehouse,
} from "@/entities/warehouse";
import { Button } from "@/shared/ui/controls";
import { Feedback, RetryButton } from "@/shared/ui/feedback";
import { SegmentedControl } from "@/shared/ui/navigation";
import { Modal } from "@/shared/ui/overlays";
import styles from "./ProductDetail.module.css";
import { ProductFacts } from "./ProductFacts";
import { ProductForm } from "./ProductForm";
import { ProductMovements } from "./ProductMovements";
import { ProductOrdersPanel } from "./ProductOrdersPanel";
import { ProductStockPanel } from "./ProductStockPanel";

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
	const [tab, setTab] = useState<"stock" | "orders" | "movements">("stock");
	const [editing, setEditing] = useState(false);
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
	const canEdit = product.allowedActions?.includes("edit");
	const stock = warehouse.stock.filter((item) => item.product === product.id);
	const category = warehouse.categories.find(
		(item) => item.id === product.category,
	);
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
					<div className={styles.header}>
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
					<ProductFacts product={product} stock={stock} />
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
					{tab === "stock" && (
						<ProductStockPanel
							stock={stock}
							cells={details.warehouse.cells}
							filters={stockFilters}
							onChange={setStockFilters}
						/>
					)}
					{tab !== "stock" && details.loading && (
						<Feedback tone="loading">Загружаем данные…</Feedback>
					)}
					{details.error && (
						<Feedback
							tone={details.hasData ? "warning" : "error"}
							action={
								<RetryButton variant="secondary" onRetry={details.retry} />
							}
						>
							Не удалось обновить данные карточки.
						</Feedback>
					)}
					{tab === "orders" && details.hasData && (
						<ProductOrdersPanel
							warehouseId={warehouse.id}
							warehouseOrders={details.warehouse.orders}
							productId={product.id}
							filters={orderFilters}
							onChange={setOrderFilters}
						/>
					)}
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
