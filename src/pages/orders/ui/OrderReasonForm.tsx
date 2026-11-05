import { Button, Field, FormShell, Textarea } from "@/shared/ui";
import type { useOrderDetail } from "../model/useOrderDetail";
import orderLayout from "./OrdersPage.module.css";

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
					<Field className={orderLayout.lineField} label="Причина *">
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
