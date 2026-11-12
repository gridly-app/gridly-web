import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ListFilters, useTableColumns } from "@/shared/ui/dataDisplay";
import { Select } from "@/shared/ui/forms";
import styles from "./OrderLines.module.css";
import { type OrderLine, OrderLinesTable } from "./OrderLinesTable";

export interface OrderLinesProps {
	warehouseId: string;
	model: { lines: OrderLine[] };
	inline?: boolean;
}

const number = new Intl.NumberFormat("ru-RU");

export function OrderLines({
	model,
	warehouseId,
	inline = false,
}: OrderLinesProps) {
	const { lines } = model;
	const [search, setSearch] = useState("");
	const [price, setPrice] = useState("all");
	const [progress, setProgress] = useState("all");
	const [params] = useSearchParams();
	const container = useRef<HTMLElement>(null);
	const unpriced =
		!inline &&
		(params.get("price") === "missing" ||
			params.get("highlight") === "unpriced");
	const category = params.get("category") || "all";
	const query = search.trim().toLowerCase();
	const visible = lines
		.map((line, index) => ({ line, index }))
		.filter(
			({ line }) =>
				`${line.productName} ${line.sku ?? ""}`.toLowerCase().includes(query) &&
				(price === "all" || line.unpriced === (price === "missing")) &&
				(progress === "all" ||
					(line.remaining !== null &&
						(progress === "complete"
							? line.remaining === 0
							: line.remaining > 0))),
		);
	const showProgress = lines.some(
		(line) => line.putaway !== undefined || line.writtenOff !== undefined,
	);

	const columns = useTableColumns("order-lines", [
		"Заказано",
		"Обработано",
		"Осталось",
		"Срок годности",
		"Стоимость",
		...(showProgress ? ["Размещено / списано"] : [""]),
		"Остатки",
	]);

	useEffect(() => {
		if (unpriced)
			container.current
				?.querySelector<HTMLElement>('[data-unpriced-highlight="true"]')
				?.scrollIntoView({ block: "nearest" });
	}, [unpriced]);

	return (
		<section
			ref={container}
			className={styles.orderLines}
			aria-label="Состав заказа"
		>
			{!inline && <h3>Состав заказа</h3>}
			<p className={styles.total}>
				Позиций: {number.format(lines.length)} · Всего:{" "}
				{number.format(lines.reduce((sum, line) => sum + line.quantity, 0))} шт.
			</p>
			{!inline && lines.length > 0 && (
				<div className={styles.lineFilters}>
					{columns.button}
					<ListFilters
						search={{
							"aria-label": "Поиск по составу заказа",
							value: search,
							onChange: setSearch,
						}}
						count={Number(price !== "all") + Number(progress !== "all")}
						onReset={() => {
							setPrice("all");
							setProgress("all");
						}}
					>
						<Select
							aria-label="Цена товара"
							value={price}
							onValueChange={setPrice}
							options={[
								{ value: "all", label: "Любая цена" },
								{ value: "set", label: "С ценой" },
								{ value: "missing", label: "Без цены" },
							]}
						/>
						<Select
							aria-label="Обработка позиции"
							value={progress}
							onValueChange={setProgress}
							options={[
								{ value: "all", label: "Любой этап обработки" },
								{ value: "complete", label: "Обработано полностью" },
								{ value: "remaining", label: "Осталось обработать" },
							]}
						/>
					</ListFilters>
				</div>
			)}
			{visible.length === 0 ? (
				<p>
					{lines.length
						? "Нет товаров по выбранным фильтрам и поиску."
						: "Состав заказа недоступен."}
				</p>
			) : (
				<OrderLinesTable
					warehouseId={warehouseId}
					visible={visible}
					showProgress={showProgress}
					hiddenColumns={inline ? undefined : columns.hiddenColumns}
					unpriced={unpriced}
					category={category}
				/>
			)}
		</section>
	);
}
