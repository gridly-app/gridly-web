import { IconPlus } from "@tabler/icons-react";
import { Button, SearchField, SegmentedControl } from "@/shared/ui";
import type { useCatalogPage } from "../model/useCatalogPage";
import catalogStyles from "./CatalogToolbar.module.css";

export interface CatalogToolbarProps {
	model: Pick<
		ReturnType<typeof useCatalogPage>,
		"tab" | "setTab" | "search" | "setSearch"
	> & { openNewItem: () => void };
}

export function CatalogToolbar({ model }: CatalogToolbarProps) {
	const { tab, openNewItem, setTab, search, setSearch } = model;

	return (
		<>
			<div className={catalogStyles.actions}>
				<Button variant="default" onClick={openNewItem}>
					<IconPlus size={18} />
					{tab === "products" ? "Новый товар" : "Новая категория"}
				</Button>
				<SegmentedControl
					aria-label="Раздел каталога"
					value={tab}
					onValueChange={setTab}
					items={[
						{ value: "products", label: "Товары" },
						{ value: "categories", label: "Категории" },
					]}
				/>
			</div>
			<SearchField value={search} onChange={setSearch} />
		</>
	);
}
