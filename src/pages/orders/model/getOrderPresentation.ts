import type { Order, Warehouse } from "@/entities/warehouse";
import { productPrice } from "@/entities/warehouse";

export function getOrderPresentation(
	order: Order,
	warehouse: Pick<Warehouse, "products">,
) {
	const products = new Map(
		warehouse.products.map((product) => [product.id, product]),
	);
	const lines = order.lines.map((line) => {
		const product = products.get(line.product);
		const unitPrice = productPrice(product?.price);
		const processed =
			order.status === "shipped" ||
			order.status === "completed" ||
			order.status === "received"
				? line.quantity
				: line.putaway !== undefined || line.writtenOff !== undefined
					? (line.putaway ?? 0) + (line.writtenOff ?? 0)
					: ["draft", "created"].includes(order.status)
						? 0
						: null;
		return {
			...line,
			unitPrice,
			processed,
			remaining:
				processed === null ? null : Math.max(0, line.quantity - processed),
			unpriced: unitPrice === null,
			category: product?.category,
			sku: product?.sku,
			productName: product?.name || line.product,
		};
	});
	const tasks = order.tasks?.map((task) => ({
		...task,
		confirmationActions: task.allowed_actions
			?.filter((action) => ["confirm-pick", "confirm-putaway"].includes(action))
			.map((action) => ({
				id: action,
				label:
					action === "confirm-pick"
						? "Подтвердить отбор"
						: "Подтвердить размещение",
			})),
	}));

	return { lines, tasks };
}
