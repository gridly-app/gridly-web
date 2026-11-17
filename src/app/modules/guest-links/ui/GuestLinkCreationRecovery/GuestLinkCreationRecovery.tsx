import { Button } from "@/shared/ui/controls";
import { Feedback, RetryButton } from "@/shared/ui/feedback";

export function GuestLinkCreationRecovery({
	name,
	message,
	isBusy,
	canAcknowledge,
	canRetry,
	onRefresh,
	onRetry,
	onAcknowledge,
}: {
	name: string;
	message: string | undefined;
	isBusy: boolean;
	canAcknowledge: boolean;
	canRetry: boolean;
	onRefresh: () => Promise<void>;
	onRetry: () => void;
	onAcknowledge: () => void;
}) {
	return (
		<>
			<Feedback
				tone="warning"
				action={<RetryButton onRetry={onRefresh}>Обновить список</RetryButton>}
			>
				Сервер мог выпустить ссылку «{name}». Обновите список и проверьте, есть
				ли в нём эта ссылка.
			</Feedback>
			{message && <Feedback tone="error">{message}</Feedback>}
			{canRetry && (
				<Button
					type="button"
					variant="secondary"
					onClick={onRetry}
					disabled={isBusy}
				>
					Повторить тот же выпуск
				</Button>
			)}
			{canAcknowledge && (
				<Button type="button" variant="secondary" onClick={onAcknowledge}>
					Я проверил список, разрешить новый выпуск
				</Button>
			)}
		</>
	);
}
