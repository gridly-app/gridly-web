import { errorMessage } from "@/shared/lib";
import { Feedback, RetryButton } from "@/shared/ui/feedback";

import type { WarehouseGuestLinkData } from "../../model/useWarehouseGuestLinkData";

export function WarehouseGuestLinkFeedback({
	query,
	orderResource,
	isCreating,
}: Pick<WarehouseGuestLinkData, "query" | "orderResource"> & {
	isCreating: boolean;
}) {
	function handleRetryOrders() {
		void orderResource.retry();
	}

	return (
		<>
			{query.isPending && (
				<Feedback tone="loading">Загружаем гостевые ссылки…</Feedback>
			)}
			{query.error && (
				<Feedback tone="error" action={<RetryButton onRetry={query.refetch} />}>
					{errorMessage(query.error)}
				</Feedback>
			)}
			{orderResource.loading && (
				<Feedback tone="loading">Загружаем заказы…</Feedback>
			)}
			{orderResource.error && (
				<Feedback
					tone="error"
					action={<RetryButton onRetry={handleRetryOrders} />}
				>
					{errorMessage(orderResource.error)}
				</Feedback>
			)}
			{isCreating && (
				<Feedback tone="loading">Выпускаем гостевую ссылку…</Feedback>
			)}
		</>
	);
}
