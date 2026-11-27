import type { ReactNode } from "react";

import { errorMessage } from "@/shared/lib";
import { Feedback } from "@/shared/ui/feedback";
import { RevisionConflict } from "@/shared/ui/management";

import type { EditableAccount } from "../../api/users.dto";

function conflictDetails(
	replacement: EditableAccount | null,
	readError: Error | null,
	isUnavailable: boolean,
): ReactNode {
	if (replacement) {
		return (
			<div>
				<p>
					Сохранено на сервере: {replacement.name} ({replacement.login})
				</p>
				<ul>
					{replacement.warehouses.map((warehouse) => (
						<li key={warehouse.warehouse_id}>
							{warehouse.warehouse_name}:{" "}
							{warehouse.permissions.join(", ") || "Нет разрешений"}
						</li>
					))}
				</ul>
			</div>
		);
	}

	if (readError)
		return <Feedback tone="error">{errorMessage(readError)}</Feedback>;
	if (isUnavailable)
		return <p>Пользователь больше недоступен для редактирования.</p>;

	return undefined;
}

export function UserAccessConflict({
	replacement,
	readError,
	isUnavailable,
	onRefresh,
	onRestart,
}: {
	replacement: EditableAccount | null;
	readError: Error | null;
	isUnavailable: boolean;
	onRefresh: () => Promise<unknown>;
	onRestart: () => void;
}) {
	return (
		<RevisionConflict
			details={conflictDetails(replacement, readError, isUnavailable)}
			onRefresh={onRefresh}
			onRestart={replacement ? onRestart : undefined}
		/>
	);
}
