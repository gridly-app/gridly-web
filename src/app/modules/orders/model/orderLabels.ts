import { type Order, statusLabels } from "@/domain/warehouse";

export const orderKinds = {
	inbound: "Приёмка",
	outbound: "Отгрузка",
} satisfies Record<Order["kind"], string>;

export function orderStatusLabel(status: string) {
	if (!Object.hasOwn(statusLabels, status)) return status;

	return statusLabels[status] ?? status;
}
