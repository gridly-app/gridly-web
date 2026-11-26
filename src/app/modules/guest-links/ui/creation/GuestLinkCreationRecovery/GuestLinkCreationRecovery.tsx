import { Button } from "@/shared/ui/controls";
import { Feedback, RetryButton } from "@/shared/ui/feedback";

import { guestLinkRecoveryMessage } from "../../../model/creation/guestLinkRecoveryMessage";

export function GuestLinkCreationRecovery({
	name,
	linkId,
	mismatch,
	onRevoke,
	message,
	isBusy,
	canRetry,
	onRefresh,
	onRetry,
}: {
	name: string;
	linkId?: string | undefined;
	mismatch?: boolean;
	onRevoke?: (() => void) | undefined;
	message: string | undefined;
	isBusy: boolean;
	canRetry: boolean;
	onRefresh: () => Promise<void>;
	onRetry: () => void;
}) {
	const text = guestLinkRecoveryMessage(name, linkId, mismatch);

	return (
		<>
			<Feedback
				tone="warning"
				action={<RetryButton onRetry={onRefresh}>Обновить список</RetryButton>}
			>
				{text}
			</Feedback>
			{message && <Feedback tone="error">{message}</Feedback>}
			{onRevoke && (
				<Button
					type="button"
					variant="destructive-outline"
					onClick={onRevoke}
					disabled={isBusy}
				>
					Отозвать созданную ссылку
				</Button>
			)}
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
		</>
	);
}
