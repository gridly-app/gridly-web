import type { Category } from "@/entities/warehouse";
import {
	Button,
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/shared/ui";
import type { CatalogCategory } from "../model/catalog";

export interface CategoriesTableProps {
	items: readonly CatalogCategory[];
	hiddenColumns: readonly number[];
	onOpen: (category: Category) => void;
}

export function CategoriesTable({
	items,
	onOpen,
	hiddenColumns,
}: CategoriesTableProps) {
	return (
		<Table hiddenColumns={hiddenColumns}>
			<TableHeader>
				<TableRow>
					<TableHead>Категория</TableHead>
					<TableHead>Товаров</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{items.map((c) => (
					<TableRow key={c.id}>
						<TableCell>
							<Button variant="text" size="sm" onClick={() => onOpen(c)}>
								{c.name}
							</Button>
						</TableCell>
						<TableCell>{c.productCount ?? "—"}</TableCell>
					</TableRow>
				))}
			</TableBody>
		</Table>
	);
}
