import { type ReactNode, Suspense } from "react";
import { useSearchParams } from "react-router-dom";

import type { Warehouse } from "@/domain/warehouse";
import { useWarehouses } from "@/ports/warehouse";

import { errorMessage } from "@/shared/lib";
import { Feedback, RetryButton } from "@/shared/ui/feedback";
import { Modal } from "@/shared/ui/overlays";

export function AdminOrderDialog({
	warehouseId,
	renderOrder,
}: {
	warehouseId: string;
	renderOrder: (warehouse: Warehouse) => ReactNode;
}) {
	const warehouses = useWarehouses();
	const [, setParams] = useSearchParams();
	const warehouse = warehouses.data?.find(({ id }) => id === warehouseId);

	function handleClose() {
		setParams(
			(current) => {
				const next = new URLSearchParams(current);
				next.delete("order");

				return next;
			},
			{ replace: true },
		);
	}

	if (warehouse)
		return (
			<Suspense
				fallback={
					<Feedback tone="loading">Загружаем карточку заказа…</Feedback>
				}
			>
				{renderOrder(warehouse)}
			</Suspense>
		);

	return (
		<Modal title="Карточка заказа" onClose={handleClose}>
			{warehouses.isPending && (
				<Feedback tone="loading">Загружаем склады…</Feedback>
			)}
			{warehouses.error && (
				<Feedback
					tone="error"
					action={<RetryButton onRetry={warehouses.refetch} />}
				>
					{errorMessage(warehouses.error)}
				</Feedback>
			)}
			{warehouses.isSuccess && (
				<Feedback tone="error">Склад недоступен.</Feedback>
			)}
		</Modal>
	);
}
