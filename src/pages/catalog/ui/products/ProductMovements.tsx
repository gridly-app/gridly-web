import { useState } from "react";
import type { Order, Warehouse } from "@/entities/warehouse";
import { useWorkspaceMode } from "@/shared/auth";
import { warehousePath } from "@/shared/config";
import {
	ListFilters,
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/shared/ui/dataDisplay";
import { Select } from "@/shared/ui/forms";
import { Link } from "@/shared/ui/navigation";

export function ProductMovements({
	productId,
	warehouse,
}: {
	productId: string;
	warehouse: Warehouse;
}) {
	const mode = useWorkspaceMode();
	const [search, setSearch] = useState("");
	const [type, setType] = useState("all");
	const number = new Intl.NumberFormat("ru-RU");
	const date = new Intl.DateTimeFormat("ru-RU", {
		dateStyle: "medium",
		timeZone: warehouse.timezone,
	});
	const movements = warehouse.orders.flatMap((order) => {
		const lines = order.lines.filter((line) => line.product === productId);
		const quantity = lines.reduce(
			(sum, line) =>
				sum +
				(order.kind === "inbound"
					? (line.putaway ?? (order.status === "received" ? line.quantity : 0))
					: ["shipped", "completed"].includes(order.status)
						? line.quantity
						: 0),
			0,
		);
		return quantity > 0
			? [
					{
						id: `order:${order.id}`,
						order,
						quantity: order.kind === "inbound" ? quantity : -quantity,
						type: order.kind === "inbound" ? "Размещение" : "Отгрузка",
						time: "",
						reason: "",
					},
				]
			: [];
	});
	const writeOffs = (warehouse.writeOffs ?? [])
		.filter((item) => item.product === productId)
		.map((item) => ({
			id: `writeoff:${item.id}`,
			order: null as Order | null,
			quantity: -item.quantity,
			type: "Списание",
			time: item.time,
			reason: item.reason,
		}));
	const rows = [...movements, ...writeOffs].sort((a, b) =>
		(b.time || b.order?.created || "").localeCompare(
			a.time || a.order?.created || "",
		),
	);

	const visible = rows.filter(
		(row) =>
			(type === "all" || row.type === type) &&
			`${row.type} ${row.order?.number ?? ""} ${row.reason}`
				.toLowerCase()
				.includes(search.trim().toLowerCase()),
	);

	if (!rows.length) return <p>Движений товара в доступных данных нет.</p>;
	return (
		<>
			<ListFilters
				search={{
					"aria-label": "Поиск по движениям товара",
					value: search,
					onChange: setSearch,
				}}
				count={Number(type !== "all")}
				onReset={() => setType("all")}
			>
				<Select
					aria-label="Тип операции"
					value={type}
					onValueChange={setType}
					options={[
						{ value: "all", label: "Все операции" },
						...[...new Set(rows.map((row) => row.type))].map((value) => ({
							value,
							label: value,
						})),
					]}
				/>
			</ListFilters>
			{visible.length ? (
				<Table aria-label="Движения товара">
					<TableHeader>
						<TableRow>
							<TableHead>Операция</TableHead>
							<TableHead>Изменение</TableHead>
							<TableHead>Дата операции</TableHead>
							<TableHead>Основание</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{visible.map((row) => (
							<TableRow key={row.id}>
								<TableCell>{row.type}</TableCell>
								<TableCell>
									{row.quantity > 0 ? "+" : ""}
									{number.format(row.quantity)} шт.
								</TableCell>
								<TableCell>
									{row.time && Number.isFinite(Date.parse(row.time))
										? date.format(new Date(row.time))
										: "—"}
								</TableCell>
								<TableCell>
									{row.order ? (
										<Link
											to={{
												pathname: warehousePath(
													mode,
													warehouse.id,
													row.order.kind,
												),
												search: new URLSearchParams({
													order: row.order.id,
												}).toString(),
											}}
										>
											{row.order.number}
										</Link>
									) : (
										row.reason || "—"
									)}
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			) : (
				<p>Нет движений по выбранным фильтрам и поиску.</p>
			)}
		</>
	);
}
