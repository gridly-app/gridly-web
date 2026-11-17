import { Button, Textarea } from "@/shared/ui/controls";
import { Field, FormShell } from "@/shared/ui/forms";
import type { useOrderDetail } from "../../model/useOrderDetail";
import styles from "./OrderReasonForm.module.css";

export interface OrderReasonFormProps {
	model: Pick<
		ReturnType<typeof useOrderDetail>,
		"reasonAction" | "pending" | "reasonLabel" | "handleSubmit" | "closeReason"
	>;
}

export function OrderReasonForm({ model }: OrderReasonFormProps) {
	const { reasonAction, pending, reasonLabel, handleSubmit, closeReason } =
		model;

	return (
		<>
			{reasonAction && (
				<FormShell
					submitVariant="destructive"
					pending={pending}
					submitLabel={reasonLabel}
					onSubmit={handleSubmit}
				>
					<p>
						{reasonAction === "abort"
							? "Прерывание запустит возврат груза. Товар не исчезнет мгновенно."
							: "Просроченные партии будут списаны из текущих мест хранения и грузов."}
					</p>
					<Field className={styles.reasonField} label="Причина *">
						<Textarea name="reason" required minLength={1} maxLength={500} />
					</Field>
					<Button variant="ghost" type="button" onClick={closeReason}>
						Назад
					</Button>
				</FormShell>
			)}
		</>
	);
}
