import type { ReactNode } from "react";

import { Button } from "@/shared/ui/controls";
import { Feedback, RetryButton } from "@/shared/ui/feedback";

import styles from "../ManagementLayout.module.css";

export function RevisionConflict({
	details,
	onRefresh,
	onRestart,
}: {
	details?: ReactNode;
	onRefresh: () => Promise<unknown>;
	onRestart?: (() => void) | undefined;
}) {
	return (
		<div className={styles.form}>
			<Feedback tone="warning" action={<RetryButton onRetry={onRefresh} />}>
				Запись изменилась. Загрузите актуальные данные для сверки с черновиком.
			</Feedback>
			{details}
			{onRestart && (
				<Button type="button" variant="secondary" onClick={onRestart}>
					Заменить черновик актуальными данными
				</Button>
			)}
		</div>
	);
}
