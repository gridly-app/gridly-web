import { useState } from "react";

import type { Order } from "@/domain/warehouse";
import { warehousePath } from "@/ports/navigation";
import { useWorkspaceMode } from "@/ports/session";
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

import {
	type ProductMovement,
	productMovements,
} from "../../model/productMovements";
import type { CatalogMovementsWarehouse } from "../../model/warehouseResources";

const numberFormat = new Intl.NumberFormat("ru-RU");

function matchesMovement(
	movement: ProductMovement,
	type: string,
	searchQuery: string,
) {
	const text =
		`${movement.type} ${movement.order?.number ?? ""} ${movement.reason}`.toLowerCase();

	return (
		(type === "all" || movement.type === type) && text.includes(searchQuery)
	);
}

export function ProductMovements({
	productId,
	warehouse,
}: {
	productId: string;
	warehouse: CatalogMovementsWarehouse;
}) {
	const [search, setSearch] = useState("");
	const [type, setType] = useState("all");
	const movements = productMovements(warehouse, productId);
	const searchQuery = search.trim().toLowerCase();
	const visible = movements.filter((movement) =>
		matchesMovement(movement, type, searchQuery),
	);
	const typeOptions = [
		{ value: "all", label: "Все операции" },
		...[...new Set(movements.map((movement) => movement.type))].map(
			(value) => ({ value, label: value }),
		),
	];
	const searchField = {
		"aria-label": "Поиск по движениям товара",
		value: search,
		onChange: setSearch,
	};

	function handleReset() {
		setType("all");
	}

	if (!movements.length) return <p>Движений товара в доступных данных нет.</p>;

	return (
		<>
			<ListFilters
				search={searchField}
				count={Number(type !== "all")}
				onReset={handleReset}
			>
				<Select
					aria-label="Тип операции"
					value={type}
					onValueChange={setType}
					options={typeOptions}
				/>
			</ListFilters>
			{visible.length ? (
				<MovementsTable
					movements={visible}
					warehouseId={warehouse.id}
					timeZone={warehouse.timezone}
				/>
			) : (
				<p>Нет движений по выбранным фильтрам и поиску.</p>
			)}
		</>
	);
}

function MovementsTable({
	movements,
	warehouseId,
	timeZone,
}: {
	movements: ProductMovement[];
	warehouseId: string;
	timeZone: string;
}) {
	const mode = useWorkspaceMode();
	const dateFormat = new Intl.DateTimeFormat("ru-RU", {
		dateStyle: "medium",
		timeZone,
	});

	function formatTime(time: string) {
		return time && Number.isFinite(Date.parse(time))
			? dateFormat.format(new Date(time))
			: "—";
	}

	function orderLink(order: Order) {
		return {
			pathname: warehousePath(mode, warehouseId, order.kind),
			search: new URLSearchParams({ order: order.id }).toString(),
		};
	}

	return (
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
				{movements.map((movement) => (
					<TableRow key={movement.id}>
						<TableCell>{movement.type}</TableCell>
						<TableCell>
							{movement.quantity > 0 ? "+" : ""}
							{numberFormat.format(movement.quantity)} шт.
						</TableCell>
						<TableCell>{formatTime(movement.time)}</TableCell>
						<TableCell>
							{movement.order ? (
								<Link to={orderLink(movement.order)}>
									{movement.order.number}
								</Link>
							) : (
								movement.reason || "—"
							)}
						</TableCell>
					</TableRow>
				))}
			</TableBody>
		</Table>
	);
}
