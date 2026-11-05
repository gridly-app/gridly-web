import { IconPlus } from "@tabler/icons-react";
import {
	Button,
	SearchField,
	SegmentedControl,
	StableLabel,
} from "@/shared/ui";
import type { CatalogTab } from "../model/catalog";
import catalogStyles from "./CatalogToolbar.module.css";

export interface CatalogToolbarProps {
	tab: CatalogTab;
	canCreate: boolean;
	search: string;
	onTabChange: (tab: CatalogTab) => void;
	onSearchChange: (search: string) => void;
	onCreate: () => void;
}

export function CatalogToolbar({
	tab,
	canCreate,
	search,
	onTabChange,
	onSearchChange,
	onCreate,
}: CatalogToolbarProps) {
	return (
		<>
			<div className={catalogStyles.actions}>
				<Button
					disabled={!canCreate}
					title={
						!canCreate ? "Создание недоступно по данным сервера" : undefined
					}
					variant="default"
					onClick={onCreate}
				>
					<IconPlus size={18} />
					<StableLabel variants={["Новый товар", "Новая категория"]}>
						{tab === "products" ? "Новый товар" : "Новая категория"}
					</StableLabel>
				</Button>
				<SegmentedControl
					aria-label="Раздел каталога"
					value={tab}
					onValueChange={onTabChange}
					items={[
						{ value: "products", label: "Товары" },
						{ value: "categories", label: "Категории" },
					]}
				/>
			</div>
			<SearchField
				aria-label="Поиск по каталогу"
				value={search}
				onChange={onSearchChange}
			/>
		</>
	);
}
