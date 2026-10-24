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
import type { useInventoryPage } from "../model/useInventoryPage";
import localLayout from "./Layout.module.css";

export interface InventoryTableProps {
	model: Pick<
		ReturnType<typeof useInventoryPage>,
		"visibleStock" | "pending" | "setSelected"
	>;
}

export function InventoryTable({ model }: InventoryTableProps) {
	const { visibleStock, pending } = model;

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
				{visibleStock.map((s) => (
					<TableRow key={s.id}>
						<TableCell>
							<b>{s.productName}</b>
							<small className={`${localLayout.block} ${localLayout.muted}`}>
								{s.id.slice(0, 8)}
							</small>
						</TableCell>
						<TableCell>{s.zoneName}</TableCell>
						<TableCell>{s.quantity} шт.</TableCell>
						<TableCell>{s.reserved} шт.</TableCell>
						<TableCell>
							<Badge value={s.isExpired ? "expired" : "Годно"} />
							<small className={`${localLayout.block} ${localLayout.muted}`}>
								{s.expires || "Без ограничения"}
							</small>
						</TableCell>
						<TableCell>
							<TableActions>
								<Button
									size="sm"
									variant="ghost"
									disabled={pending || !s.canWriteOff}
									onClick={() => model.setSelected(s)}
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
