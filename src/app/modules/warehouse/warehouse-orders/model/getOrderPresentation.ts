import {
	type Order,
	processedQuantity,
	productPrice,
	type WarehouseView,
} from "@/domain/warehouse";

const fulfilledStatuses = ["shipped", "completed", "received"];
const notStartedStatuses = ["draft", "created"];
const confirmationLabels: Record<string, string> = {
	"confirm-pick": "Подтвердить отбор",
	"confirm-putaway": "Подтвердить размещение",
};

function lineProcessed(order: Order, line: Order["lines"][number]) {
	if (fulfilledStatuses.includes(order.status)) return line.quantity;
	if (line.putaway !== undefined || line.writtenOff !== undefined)
		return processedQuantity(line);
	if (notStartedStatuses.includes(order.status)) return 0;

	return null;
}

function confirmationActions(allowedActions: string[] | undefined) {
	return allowedActions
		?.filter((action) => action in confirmationLabels)
		.map((action) => ({
			id: action,
			label: confirmationLabels[action] ?? action,
		}));
}

export function getOrderPresentation(
	order: Order,
	warehouse: Pick<WarehouseView<"catalog">, "products">,
) {
	const products = new Map(
		warehouse.products.map((product) => [product.id, product]),
	);
	const lines = order.lines.map((line) => {
		const product = products.get(line.product);
		const unitPrice = productPrice(product?.price);
		const processed = lineProcessed(order, line);

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
		confirmationActions: confirmationActions(task.allowed_actions),
	}));

	return { lines, tasks };
}
