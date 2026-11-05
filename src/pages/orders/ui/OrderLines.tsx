import { useEffect, useRef, useState } from "react";
import { Link as RouterLink, useSearchParams } from "react-router-dom";
import { useWorkspaceMode } from "@/shared/auth";
import { warehousePath } from "@/shared/config";
import {
	Link,
	ListFilters,
	Select,
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
	useTableColumns,
} from "@/shared/ui";
import type { getOrderPresentation } from "../model/getOrderPresentation";
import localLayout from "./Layout.module.css";

export interface OrderLinesProps {
	warehouseId: string;
	model: Pick<ReturnType<typeof getOrderPresentation>, "lines">;
	inline?: boolean;
}

const number = new Intl.NumberFormat("ru-RU");
const money = new Intl.NumberFormat("ru-RU", {
	style: "currency",
	currency: "RUB",
});

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
	const mode = useWorkspaceMode();
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
		<section ref={container} className="order-lines" aria-label="Состав заказа">
			{!inline && <h3>Состав заказа</h3>}
			<p className={localLayout.muted}>
				Позиций: {number.format(lines.length)} · Всего:{" "}
				{number.format(lines.reduce((sum, line) => sum + line.quantity, 0))} шт.
			</p>
			{!inline && lines.length > 0 && (
				<div className="flex flex-wrap items-center gap-2">
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
				<Table hiddenColumns={inline ? undefined : columns.hiddenColumns}>
					<TableHeader>
						<TableRow>
							<TableHead>Товар</TableHead>
							<TableHead>Заказано</TableHead>
							<TableHead>Обработано</TableHead>
							<TableHead>Осталось</TableHead>
							<TableHead>Срок годности</TableHead>
							<TableHead>Стоимость</TableHead>
							{showProgress && <TableHead>Размещено / списано</TableHead>}
							<TableHead>Остатки</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{visible.map(({ line, index }) => (
							<TableRow
								key={line.id || index}
								data-unpriced-highlight={
									unpriced &&
									line.unpriced &&
									(category === "all" || line.category === category)
								}
							>
								<TableCell>
									{line.sku !== undefined ? (
										<Link
											render={
												<RouterLink
													to={{
														pathname: warehousePath(
															mode,
															warehouseId,
															"catalog",
														),
														search: new URLSearchParams({
															product: line.product,
														}).toString(),
													}}
												/>
											}
										>
											{line.productName}
										</Link>
									) : (
										<strong>{line.productName}</strong>
									)}
									{line.sku && <small className="table-note">{line.sku}</small>}
								</TableCell>
								<TableCell>{number.format(line.quantity)} шт.</TableCell>
								<TableCell>
									{line.processed === null
										? "—"
										: `${number.format(line.processed)} шт.`}
								</TableCell>
								<TableCell>
									{line.remaining === null
										? "—"
										: `${number.format(line.remaining)} шт.`}
								</TableCell>
								<TableCell>{line.expires || "Без срока"}</TableCell>
								<TableCell>
									{line.unitPrice === null
										? "Без цены"
										: money.format(line.unitPrice * line.quantity)}
								</TableCell>
								{showProgress && (
									<TableCell>
										{line.putaway === undefined && line.writtenOff === undefined
											? "—"
											: `${number.format(line.putaway ?? 0)} / ${number.format(line.writtenOff ?? 0)}`}
									</TableCell>
								)}
								<TableCell>
									<Link
										render={
											<RouterLink
												to={{
													pathname: warehousePath(
														mode,
														warehouseId,
														"inventory",
													),
													search: new URLSearchParams({
														product: line.product,
													}).toString(),
												}}
											/>
										}
									>
										Партии товара
									</Link>
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			)}
		</section>
	);
}
