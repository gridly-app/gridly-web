import { IconArchive, IconArchiveOff, IconPencil } from "@tabler/icons-react";
import { StatusBadge as Badge, type Product } from "@/entities/warehouse";

import {
	IconButton,
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
					<TableHead>Объём единицы</TableHead>
					<TableHead>Занято на складе</TableHead>
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
							<strong>
								{p.occupiedVolume === null
									? "—"
									: `${p.occupiedVolume.toLocaleString("ru-RU", { maximumFractionDigits: 3 })} м³`}
							</strong>
							<small className="table-note">
								{p.stockQuantity.toLocaleString("ru-RU")} шт. · включая резерв
							</small>
						</TableCell>
						<TableCell>
							{p.price ? Number(p.price).toLocaleString("ru") : "—"} ₽
						</TableCell>
						<TableCell>
							<TableActions>
								<IconButton
									label="Изменить"
									icon={<IconPencil size={16} />}
									variant="secondary"
									disabled={pending || !p.allowedActions?.includes("edit")}
									onClick={() => onEdit(p)}
								/>
								<IconButton
									label={p.archived ? "Восстановить" : "В архив"}
									icon={
										p.archived ? (
											<IconArchiveOff size={16} />
										) : (
											<IconArchive size={16} />
										)
									}
									variant="ghost"
									disabled={
										pending ||
										!p.allowedActions?.includes(
											p.archived ? "restore" : "archive",
										)
									}
									onClick={() => void onToggleArchive(p.id)}
								/>
							</TableActions>
						</TableCell>
					</TableRow>
				))}
			</TableBody>
		</Table>
	);
}
