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

import type { useCatalogDialog } from "../model/useCatalogDialog";
import type { useCatalogPage } from "../model/useCatalogPage";

export interface CategoriesTableProps {
	model: Pick<ReturnType<typeof useCatalogPage>, "visibleCategories"> &
		Pick<ReturnType<typeof useCatalogDialog>, "editCategory">;
}

export function CategoriesTable({ model }: CategoriesTableProps) {
	const { visibleCategories } = model;

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
				{visibleCategories.map((c) => (
					<TableRow key={c.id}>
						<TableCell>
							<b>{c.name}</b>
						</TableCell>
						<TableCell>{c.cold ? "Холодное" : "Обычное"}</TableCell>
						<TableCell>{c.productCount}</TableCell>
						<TableCell>
							<TableActions>
								<Button
									size="sm"
									variant="ghost"
									onClick={() => model.editCategory(c)}
								>
									Изменить
								</Button>
							</TableActions>
						</TableCell>
					</TableRow>
				))}
			</TableBody>
		</Table>
	);
}
