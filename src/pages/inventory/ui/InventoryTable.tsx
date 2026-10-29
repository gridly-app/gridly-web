import { StatusBadge as Badge } from "@/entities/warehouse";

import {
	Button,
	Table,
	TableActions,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/shared/ui";
import type { InventoryStock } from "../model/inventoryStock";
import localLayout from "./Layout.module.css";

export interface InventoryTableProps {
	items: readonly InventoryStock[];
	pending: boolean;
	onWriteOff: (stock: InventoryStock) => void;
}

export function InventoryTable({
	items,
	pending,
	onWriteOff,
}: InventoryTableProps) {
	return (
		<Table>
			<TableHeader>
				<TableRow>
					<TableHead>Товар / партия</TableHead>
					<TableHead>Зона</TableHead>
					<TableHead>Количество</TableHead>
					<TableHead>Резерв</TableHead>
					<TableHead>Годность</TableHead>
					<TableHead />
				</TableRow>
			</TableHeader>
			<TableBody>
				{items.map((s) => (
					<TableRow key={s.id}>
						<TableCell>
							<b>{s.productName}</b>
							<small className={`${localLayout.block} ${localLayout.muted}`}>
								{s.id.slice(0, 8)}
							</small>
						</TableCell>
						<TableCell>{s.zoneName}</TableCell>
						<TableCell>{s.quantity} шт.</TableCell>
						<TableCell>{s.reserved ?? "—"} шт.</TableCell>
						<TableCell>
							{s.isExpired === undefined ? (
								"—"
							) : (
								<Badge value={s.isExpired ? "expired" : "Годно"} />
							)}
							<small className={`${localLayout.block} ${localLayout.muted}`}>
								{s.expires || "Без ограничения"}
							</small>
						</TableCell>
						<TableCell>
							<TableActions>
								<Button
									size="sm"
									variant="ghost"
									title={
										s.writeOffBlockedReason ||
										(!s.canWriteOff
											? "Списание недоступно по данным сервера"
											: undefined)
									}
									disabled={pending || !s.canWriteOff}
									onClick={() => onWriteOff(s)}
								>
									Списать
								</Button>
							</TableActions>
						</TableCell>
					</TableRow>
				))}
			</TableBody>
		</Table>
	);
}
