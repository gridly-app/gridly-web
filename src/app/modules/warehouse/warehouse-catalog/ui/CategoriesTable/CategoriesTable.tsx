import type { Category } from "@/domain/warehouse";
import { Button } from "@/shared/ui/controls";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/shared/ui/dataDisplay";

export function CategoriesTable({
	items,
	hiddenColumns,
	onOpen,
}: {
	items: readonly Category[];
	hiddenColumns: readonly number[];
	onOpen: (category: Category) => void;
}) {
	return (
		<Table hiddenColumns={hiddenColumns}>
			<TableHeader>
				<TableRow>
					<TableHead>Категория</TableHead>
					<TableHead>Товаров</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{items.map((category) => (
					<TableRow key={category.id}>
						<TableCell>
							<Button variant="text" size="sm" onClick={() => onOpen(category)}>
								{category.name}
							</Button>
						</TableCell>
						<TableCell>{category.productCount ?? "—"}</TableCell>
					</TableRow>
				))}
			</TableBody>
		</Table>
	);
}
