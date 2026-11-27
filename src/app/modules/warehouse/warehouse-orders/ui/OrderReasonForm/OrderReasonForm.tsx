import { Button, Textarea } from "@/shared/ui/controls";
import { Field, FormShell } from "@/shared/ui/forms";

import type { useOrderDetail } from "../../model/useOrderDetail";

import styles from "./OrderReasonForm.module.css";

const reasonMaxLength = 500;
const reasonDescriptions: Record<string, string> = {
	abort: "Прерывание запустит возврат груза. Товар не исчезнет мгновенно.",
	"write-off-expired":
		"Просроченные партии будут списаны из текущих мест хранения и грузов.",
};

export function OrderReasonForm({
	model,
}: {
	model: Pick<
		ReturnType<typeof useOrderDetail>,
		"reasonAction" | "pending" | "reasonLabel" | "handleSubmit" | "closeReason"
	>;
}) {
	const { reasonAction, pending, reasonLabel, handleSubmit, closeReason } =
		model;

	if (!reasonAction) return null;

	return (
		<FormShell
			submitVariant="destructive"
			pending={pending}
			submitLabel={reasonLabel}
			onSubmit={handleSubmit}
		>
			<p>
				{reasonDescriptions[reasonAction] ??
					reasonDescriptions["write-off-expired"]}
			</p>
			<Field className={styles.reasonField} label="Причина *">
				<Textarea
					name="reason"
					required
					minLength={1}
					maxLength={reasonMaxLength}
				/>
			</Field>
			<Button variant="ghost" type="button" onClick={closeReason}>
				Назад
			</Button>
		</FormShell>
	);
}
