import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { ListFilters, useTableColumns } from "@/shared/ui/dataDisplay";
import { Select } from "@/shared/ui/forms";

import {
	type OrderLine,
	OrderLinesTable,
} from "../OrderLinesTable/OrderLinesTable";

import styles from "./OrderLines.module.css";

const numberFormat = new Intl.NumberFormat("ru-RU");
const priceOptions = [
	{ value: "all", label: "Любая цена" },
	{ value: "set", label: "С ценой" },
	{ value: "missing", label: "Без цены" },
];
const progressOptions = [
	{ value: "all", label: "Любой этап обработки" },
	{ value: "complete", label: "Обработано полностью" },
	{ value: "remaining", label: "Осталось обработать" },
];

function matchesProgress(line: OrderLine, progress: string) {
	if (progress === "all") return true;
	if (line.remaining === null) return false;

	return progress === "complete" ? line.remaining === 0 : line.remaining > 0;
}

export function OrderLines({
	model,
	warehouseId,
	inline = false,
}: {
	warehouseId: string;
	model: { lines: OrderLine[] };
	inline?: boolean;
}) {
	const { lines } = model;
	const [search, setSearch] = useState("");
	const [price, setPrice] = useState("all");
	const [progress, setProgress] = useState("all");
	const [params] = useSearchParams();
	const container = useRef<HTMLElement>(null);
	const isUnpricedHighlighted =
		!inline &&
		(params.get("price") === "missing" ||
			params.get("highlight") === "unpriced");
	const category = params.get("category") || "all";
	const searchQuery = search.trim().toLowerCase();
	const hasProgress = lines.some(
		(line) => line.putaway !== undefined || line.writtenOff !== undefined,
	);
	const visible = lines
		.map((line, index) => ({ line, index }))
		.filter(({ line }) =>
			`${line.productName} ${line.sku ?? ""}`
				.toLowerCase()
				.includes(searchQuery),
		)
		.filter(
			({ line }) => price === "all" || line.unpriced === (price === "missing"),
		)
		.filter(({ line }) => matchesProgress(line, progress));
	const columns = useTableColumns("order-lines", [
		"Заказано",
		"Обработано",
		"Осталось",
		"Срок годности",
		"Стоимость",
		hasProgress ? "Размещено / списано" : "",
		"Остатки",
	]);
	const totalQuantity = lines.reduce((sum, line) => sum + line.quantity, 0);
	const emptyMessage = lines.length
		? "Нет товаров по выбранным фильтрам и поиску."
		: "Состав заказа недоступен.";
	const searchField = {
		"aria-label": "Поиск по составу заказа",
		value: search,
		onChange: setSearch,
	};

	useEffect(() => {
		if (!isUnpricedHighlighted) return;

		container.current
			?.querySelector<HTMLElement>('[data-unpriced-highlight="true"]')
			?.scrollIntoView({ block: "nearest" });
	}, [isUnpricedHighlighted]);

	function handleReset() {
		setPrice("all");
		setProgress("all");
	}

	return (
		<section
			ref={container}
			className={styles.orderLines}
			aria-label="Состав заказа"
		>
			{!inline && <h3>Состав заказа</h3>}
			<p className={styles.total}>
				Позиций: {numberFormat.format(lines.length)} · Всего:{" "}
				{numberFormat.format(totalQuantity)} шт.
			</p>
			{!inline && lines.length > 0 && (
				<div className={styles.lineFilters}>
					{columns.button}
					<ListFilters
						search={searchField}
						count={Number(price !== "all") + Number(progress !== "all")}
						onReset={handleReset}
					>
						<Select
							aria-label="Цена товара"
							value={price}
							onValueChange={setPrice}
							options={priceOptions}
						/>
						<Select
							aria-label="Обработка позиции"
							value={progress}
							onValueChange={setProgress}
							options={progressOptions}
						/>
					</ListFilters>
				</div>
			)}
			{visible.length === 0 ? (
				<p>{emptyMessage}</p>
			) : (
				<OrderLinesTable
					warehouseId={warehouseId}
					visible={visible}
					hasProgress={hasProgress}
					hiddenColumns={inline ? undefined : columns.hiddenColumns}
					isUnpricedHighlighted={isUnpricedHighlighted}
					category={category}
				/>
			)}
		</section>
	);
}
