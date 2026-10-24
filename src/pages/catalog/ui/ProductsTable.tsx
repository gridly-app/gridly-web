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
import type { useCatalogDialog } from "../model/useCatalogDialog";
import type { useCatalogPage } from "../model/useCatalogPage";
import localLayout from "./Layout.module.css";

export interface ProductsTableProps {
	model: Pick<
		ReturnType<typeof useCatalogPage>,
		"visibleProducts" | "toggleProductArchive"
	> &
		Pick<ReturnType<typeof useCatalogDialog>, "editProduct"> & {
			pending: boolean;
		};
}

export function ProductsTable({ model }: ProductsTableProps) {
	const { visibleProducts, pending } = model;

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
				{visibleProducts.map((p) => (
					<TableRow key={p.id}>
						<TableCell>
							<b>{p.name}</b>
							{p.archived && <Badge value="Архив" />}
						</TableCell>
						<TableCell className={localLayout.muted}>{p.sku}</TableCell>
						<TableCell>{p.categoryName}</TableCell>
						<TableCell>{p.volume} м³</TableCell>
						<TableCell>{Number(p.price).toLocaleString("ru")} ₽</TableCell>
						<TableCell>
							<TableActions>
								<Button
									size="sm"
									variant="ghost"
									onClick={() => model.editProduct(p)}
								>
									Изменить
								</Button>
								<Button
									size="sm"
									variant="ghost"
									disabled={pending}
									onClick={() => void model.toggleProductArchive(p.id)}
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
