import { useId, useState } from "react";

import type { Order } from "@/domain/warehouse";

import { textSearch } from "@/shared/lib";

import { Checkbox } from "@/shared/ui/controls";
import { SearchField } from "@/shared/ui/forms";

import { managementStyles } from "@/shared/ui/management";
import styles from "./GuestOrderPicker.module.css";

type GuestOrder = Pick<Order, "id" | "number" | "party">;

export function GuestOrderPicker({
	orders,
	disabled,
	selectedIds,
	onCheck,
}: {
	orders: GuestOrder[];
	disabled: boolean;
	selectedIds: ReadonlySet<string>;
	onCheck: (id: string, checked: boolean) => void;
}) {
	const fieldId = useId();
	const [filter, setFilter] = useState("");
	const matches = textSearch(filter);
	const visibleOrders = orders.filter(({ number, party }) =>
		matches([number, party]),
	);

	return (
		<fieldset className={managementStyles.fieldset} disabled={disabled}>
			<legend className={managementStyles.legend}>
				Заказы на отгрузку · {selectedIds.size}
			</legend>
			<SearchField
				aria-label="Найти заказ"
				value={filter}
				onChange={setFilter}
			/>
			<div className={styles.checkList}>
				{visibleOrders.map((order) => {
					const id = `${fieldId}-order-${order.id}`;

					function handleCheck(checked: boolean) {
						onCheck(order.id, checked);
					}

					return (
						<label
							key={order.id}
							className={managementStyles.checkRow}
							htmlFor={id}
						>
							<Checkbox
								id={id}
								disabled={disabled}
								checked={selectedIds.has(order.id)}
								onCheckedChange={handleCheck}
							/>
							{order.number} · {order.party}
						</label>
					);
				})}
				{!visibleOrders.length && (
					<p className={managementStyles.subtle}>Заказы не найдены</p>
				)}
			</div>
		</fieldset>
	);
}
