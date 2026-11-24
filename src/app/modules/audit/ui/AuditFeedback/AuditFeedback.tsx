import { errorMessage } from "@/shared/lib";
import { Feedback, RetryButton } from "@/shared/ui/feedback";

export function AuditFeedback({
	rangeError,
	exportError,
	readError,
	isPending,
	isForbidden,
	onRetry,
}: {
	rangeError: string | null;
	exportError: Error | null;
	readError: Error | null;
	isPending: boolean;
	isForbidden: boolean;
	onRetry: () => void;
}) {
	const retry = <RetryButton onRetry={onRetry} />;
	const canShowLoading = !rangeError && isPending;
	const canShowReadError = !rangeError && readError;
	const readMessage = isForbidden
		? "У аккаунта нет доступа к журналу аудита."
		: errorMessage(readError);

	return (
		<>
			{rangeError && <Feedback tone="error">{rangeError}</Feedback>}
			{exportError && <Feedback tone="error">{exportError.message}</Feedback>}
			{canShowLoading && <Feedback tone="loading">Загружаем журнал…</Feedback>}
			{canShowReadError && (
				<Feedback tone="error" action={isForbidden ? undefined : retry}>
					{readMessage}
				</Feedback>
			)}
		</>
	);
}
