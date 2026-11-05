import type { Order } from "@/entities/warehouse";
import { StatusBadge as Badge } from "@/entities/warehouse";
import { Feedback } from "@/shared/ui";
import localLayout from "./Layout.module.css";

export interface OrderSummaryProps {
	model: { o: Order };
}

export function OrderSummary({ model }: OrderSummaryProps) {
	const { o } = model;

	return (
		<>
			<div className="grid gap-1">
				<div className={`${localLayout.row} ${localLayout.wrap}`}>
					<h3>{o.number}</h3>
					<Badge value={o.status} />
				</div>
				<p>{o.party}</p>
			</div>
			{(o.blockedReason || o.reason) && (
				<Feedback tone="error" role="alert">
					{o.blockedReason || o.reason}
				</Feedback>
			)}
			{o.status === "aborting" && (
				<Feedback tone="info">
					Груз возвращается на хранение. Док остаётся занят до завершения
					возврата.
				</Feedback>
			)}
		</>
	);
}
