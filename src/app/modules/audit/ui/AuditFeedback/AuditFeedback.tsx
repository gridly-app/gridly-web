import { errorMessage } from "@/shared/lib";
import { Feedback, RetryButton } from "@/shared/ui/feedback";

export function AuditFeedback({
	rangeError,
	exportError,
	readError,
	isPending,
	hasMore,
	hasChanged,
	isForbidden,
	onRetry,
}: {
	rangeError: string | null;
	exportError: Error | null;
	readError: Error | null;
	isPending: boolean;
	hasMore: boolean;
	hasChanged: boolean;
	isForbidden: boolean;
	onRetry: () => void;
}) {
	const retry = <RetryButton onRetry={onRetry} />;
	const canShowReadProgress = !rangeError && !readError;
	const canShowLoading = !rangeError && isPending;
	const canShowReadError = !rangeError && readError;
	const readMessage = isForbidden
		? "У аккаунта нет доступа к журналу аудита."
		: errorMessage(readError);

	return (
		<>
			{rangeError && <Feedback tone="error">{rangeError}</Feedback>}
			{exportError && (
				<Feedback tone="error" action={retry}>
					{errorMessage(exportError)}
				</Feedback>
			)}
			{canShowLoading && <Feedback tone="loading">Загружаем журнал…</Feedback>}
			{canShowReadError && (
				<Feedback tone="error" action={isForbidden ? undefined : retry}>
					{readMessage}
				</Feedback>
			)}
			{canShowReadProgress && hasMore && (
				<Feedback tone="info">
					Загружаем остальные события. Результаты пока неполные.
				</Feedback>
			)}
			{canShowReadProgress && hasChanged && (
				<Feedback tone="warning" action={retry}>
					Журнал изменился во время чтения. Обновите его перед экспортом.
				</Feedback>
			)}
		</>
	);
}
