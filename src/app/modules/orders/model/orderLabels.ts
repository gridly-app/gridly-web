import { type Order, statusLabels } from "@/domain/warehouse";

export const orderKinds = {
	inbound: "Приёмка",
	outbound: "Отгрузка",
} satisfies Record<Order["kind"], string>;
export const orderStatusLabel = (status: string) =>
	Object.hasOwn(statusLabels, status)
		? (statusLabels[status] ?? status)
		: status;
