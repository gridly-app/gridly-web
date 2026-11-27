import { useState } from "react";

import type { LayoutOperation } from "@/ports/warehouse";
import { ErrorNotice, Feedback, RetryButton } from "@/shared/ui/feedback";

import { layoutStatus } from "../../model/draft/layoutStatus";

export function LayoutOperationFeedback({
	operation,
	onRetryRead,
}: {
	operation: LayoutOperation | null;
	onRetryRead: () => Promise<void>;
}) {
	const [retryError, setRetryError] = useState("");
	const status = layoutStatus(operation);
	const canRetryCommit =
		operation?.status === "unknown" && operation.command.action === "saveMap";
	const canRetryRead =
		canRetryCommit ||
		operation?.status === "refresh-failed" ||
		operation?.status === "conflict";

	async function handleRetryLayout() {
		setRetryError("");

		try {
			await onRetryRead();
		} catch (error) {
			setRetryError(
				error instanceof Error
					? error.message
					: "Не удалось повторить операцию.",
			);
		}
	}

	const retryAction = canRetryRead ? (
		<RetryButton onRetry={handleRetryLayout}>
			{canRetryCommit ? "Повторить сохранение" : "Повторить"}
		</RetryButton>
	) : undefined;

	return (
		<>
			<ErrorNotice message={retryError} />
			{status && (
				<Feedback tone="warning" action={retryAction}>
					{status}
				</Feedback>
			)}
		</>
	);
}
