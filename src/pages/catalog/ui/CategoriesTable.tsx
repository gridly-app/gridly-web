import { IconPencil } from "@tabler/icons-react";
import type { Category } from "@/entities/warehouse";
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
import type { CatalogCategory } from "../model/catalog";

export interface CategoriesTableProps {
	items: readonly CatalogCategory[];
	onEdit: (category: Category) => void;
}

export function CategoriesTable({ items, onEdit }: CategoriesTableProps) {
	return (
		<Table>
			<TableHeader>
				<TableRow>
					<TableHead>Категория</TableHead>
					<TableHead>Хранение</TableHead>
					<TableHead>Товаров</TableHead>
					<TableHead />
				</TableRow>
			</TableHeader>
			<TableBody>
				{items.map((c) => (
					<TableRow key={c.id}>
						<TableCell>
							<b>{c.name}</b>
						</TableCell>
						<TableCell>{c.cold ? "Холодное" : "Обычное"}</TableCell>
						<TableCell>{c.productCount ?? "—"}</TableCell>
						<TableCell>
							<TableActions>
								<IconButton
									label="Изменить"
									icon={<IconPencil size={16} />}
									variant="secondary"
									disabled={!c.allowedActions?.includes("edit")}
									onClick={() => onEdit(c)}
								/>
							</TableActions>
						</TableCell>
					</TableRow>
				))}
			</TableBody>
		</Table>
	);
}
