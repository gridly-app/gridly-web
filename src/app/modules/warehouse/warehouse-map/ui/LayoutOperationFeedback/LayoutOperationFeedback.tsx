import { useState } from "react";

import type { LayoutOperation } from "@/ports/warehouse";
import { ErrorNotice, Feedback, RetryButton } from "@/shared/ui/feedback";

import { layoutStatus } from "../../model/draft/layoutStatus";

export function LayoutOperationFeedback({
	operation,
	retryRead,
}: {
	operation: LayoutOperation | null;
	retryRead: () => Promise<void>;
}) {
	const status = layoutStatus(operation);
	const canRetryCommit =
		operation?.status === "unknown" && operation.command.action === "saveMap";
	const canRetryRead =
		canRetryCommit ||
		operation?.status === "refresh-failed" ||
		operation?.status === "conflict";
	const [retryError, setRetryError] = useState("");

	async function handleRetryLayout() {
		setRetryError("");

		try {
			await retryRead();
		} catch (error) {
			setRetryError(
				error instanceof Error
					? error.message
					: "Не удалось повторить операцию.",
			);
		}
	}

	return (
		<>
			<ErrorNotice message={retryError} />
			{status && (
				<Feedback
					tone="warning"
					action={
						canRetryRead ? (
							<RetryButton onRetry={handleRetryLayout}>
								{canRetryCommit ? "Повторить сохранение" : "Повторить"}
							</RetryButton>
						) : undefined
					}
				>
					{status}
				</Feedback>
			)}
		</>
	);
}
