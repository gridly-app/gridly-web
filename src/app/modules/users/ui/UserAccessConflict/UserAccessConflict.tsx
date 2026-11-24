import { errorMessage } from "@/shared/lib";
import { Feedback } from "@/shared/ui/feedback";
import { RevisionConflict } from "@/shared/ui/management";

import type { EditableAccount } from "../../api/users.dto";

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
	let details;

	if (replacement) {
		details = (
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
	} else if (readError) {
		details = <Feedback tone="error">{errorMessage(readError)}</Feedback>;
	} else if (isUnavailable) {
		details = <p>Пользователь больше недоступен для редактирования.</p>;
	}

	return (
		<RevisionConflict
			details={details}
			onRefresh={onRefresh}
			onRestart={replacement ? onRestart : undefined}
		/>
	);
}
