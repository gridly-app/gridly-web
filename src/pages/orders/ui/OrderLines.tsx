import { useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { Badge, MiniCard } from "@/shared/ui";
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
	const [params] = useSearchParams();
	const container = useRef<HTMLDivElement>(null);
	const unpriced =
		params.get("price") === "missing" || params.get("highlight") === "unpriced";
	const category = params.get("category") || "all";
	useEffect(() => {
		if (unpriced)
			container.current
				?.querySelector<HTMLElement>('[data-unpriced-highlight="true"]')
				?.scrollIntoView({ block: "nearest" });
	}, [unpriced]);

	return (
		<div ref={container} className="order-lines">
			{lines.map((line, i) => (
				<MiniCard
					key={line.id || i}
					data-unpriced-highlight={
						unpriced &&
						line.unpriced &&
						(category === "all" || line.category === category)
					}
				>
					{unpriced &&
						line.unpriced &&
						(category === "all" || line.category === category) && (
							<Badge tone="success">Без цены</Badge>
						)}
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
		</div>
	);
}
