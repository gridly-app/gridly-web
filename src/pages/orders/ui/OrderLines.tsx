import { MiniCard } from "@/shared/ui";
import type { getOrderPresentation } from "../model/getOrderPresentation";
import localLayout from "./Layout.module.css";

export interface OrderLinesProps {
	model: Pick<
		ReturnType<typeof getOrderPresentation>,
		"lines" | "confirmationsLabel"
	>;
}

export function OrderLines({ model }: OrderLinesProps) {
	const { lines, confirmationsLabel } = model;

	return (
		<>
			{lines.map((line, i) => (
				<MiniCard key={line.id || i}>
					<b>{line.productName}</b>
					<p>
						Заказано: {line.quantity} шт. ·{" "}
						{line.expires || "Без срока годности"}
					</p>
					{(line.putaway !== undefined || line.writtenOff !== undefined) && (
						<p>
							Размещено: {line.putaway ?? 0} · Списано: {line.writtenOff ?? 0}
						</p>
					)}
				</MiniCard>
			))}
			<p className={localLayout.muted}>
				Ручные подтверждения: {confirmationsLabel}
			</p>
		</>
	);
}
