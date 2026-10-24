import { useId } from "react";
import { Button, Checkbox, CheckLabel } from "@/shared/ui";
import type { useOrderForm } from "../model/useOrderForm";
import localLayout from "./Layout.module.css";

export interface OrderConfirmationsProps {
	model: Pick<
		ReturnType<typeof useOrderForm>,
		"confirmations" | "resetManual" | "updateManual"
	>;
}

export function OrderConfirmations({ model }: OrderConfirmationsProps) {
	const controlId = useId();
	const { confirmations, resetManual } = model;

	return (
		<>
			<p className={localLayout["section-caption"]}>РУЧНЫЕ ПОДТВЕРЖДЕНИЯ</p>
			<div className={`${localLayout.row} ${localLayout.wrap}`}>
				{confirmations.map((confirmation) => (
					<CheckLabel
						key={confirmation.label}
						htmlFor={`${controlId}-${confirmation.index}`}
					>
						<Checkbox
							id={`${controlId}-${confirmation.index}`}
							checked={confirmation.checked}
							onCheckedChange={(checked) =>
								model.updateManual(confirmation.index, checked)
							}
						/>
						{confirmation.label}
					</CheckLabel>
				))}
			</div>
			<Button variant="text" type="button" onClick={resetManual}>
				Вернуть настройки склада
			</Button>
		</>
	);
}
