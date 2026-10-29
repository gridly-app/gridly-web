import { StatusBadge as Badge, type Product } from "@/entities/warehouse";

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
import type { CatalogProduct } from "../model/catalog";
import localLayout from "./Layout.module.css";

export interface ProductsTableProps {
	items: readonly CatalogProduct[];
	pending: boolean;
	onEdit: (product: Product) => void;
	onToggleArchive: (id: string) => void;
}

export function ProductsTable({
	items,
	pending,
	onEdit,
	onToggleArchive,
}: ProductsTableProps) {
	return (
		<Table>
			<TableHeader>
				<TableRow>
					<TableHead>Товар</TableHead>
					<TableHead>Артикул</TableHead>
					<TableHead>Категория</TableHead>
					<TableHead>Объём</TableHead>
					<TableHead>Цена</TableHead>
					<TableHead />
				</TableRow>
			</TableHeader>
			<TableBody>
				{items.map((p) => (
					<TableRow key={p.id}>
						<TableCell>
							<b>{p.name}</b>
							{p.archived && <Badge value="Архив" />}
						</TableCell>
						<TableCell className={localLayout.muted}>{p.sku}</TableCell>
						<TableCell>{p.categoryName}</TableCell>
						<TableCell>{p.volume} м³</TableCell>
						<TableCell>
							{p.price ? Number(p.price).toLocaleString("ru") : "—"} ₽
						</TableCell>
						<TableCell>
							<TableActions>
								<Button
									size="sm"
									variant="ghost"
									disabled={pending || !p.allowedActions?.includes("edit")}
									onClick={() => onEdit(p)}
								>
									Изменить
								</Button>
								<Button
									size="sm"
									variant="ghost"
									disabled={
										pending ||
										!p.allowedActions?.includes(
											p.archived ? "restore" : "archive",
										)
									}
									onClick={() => void onToggleArchive(p.id)}
								>
									{p.archived ? "Восстановить" : "В архив"}
								</Button>
							</TableActions>
						</TableCell>
					</TableRow>
				))}
			</TableBody>
		</Table>
	);
}
