import type { Order, Warehouse } from "@/entities/warehouse";

export function getOrderPresentation(
	order: Order,
	warehouse: Pick<Warehouse, "products">,
) {
	const lines = order.lines.map((line) => ({
		...line,
		productName:
			warehouse.products.find((product) => product.id === line.product)?.name ||
			line.product,
	}));
	const manualLabels = ["разгрузка", "отбор", "размещение", "погрузка"];
	const confirmationsLabel =
		order.manual
			.map((enabled, index) => (enabled ? manualLabels[index] : ""))
			.filter(Boolean)
			.join(", ") || "не требуются";
	const tasks = order.tasks?.map((task) => ({
		...task,
		typeLabel:
			task.type === "pick"
				? "Отбор"
				: task.type === "putaway"
					? "Размещение"
					: task.type,
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

	return { lines, confirmationsLabel, tasks };
}
