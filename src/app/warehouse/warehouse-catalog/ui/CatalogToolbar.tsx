import { IconPlus } from "@tabler/icons-react";
import { Button, StableLabel } from "@/shared/ui/controls";
import { SegmentedControl } from "@/shared/ui/navigation";
import type { CatalogTab } from "../model/catalog";
import catalogStyles from "./CatalogToolbar.module.css";

export interface CatalogToolbarProps {
	tab: CatalogTab;
	canCreate: boolean;
	onTabChange: (tab: CatalogTab) => void;
	onCreate: () => void;
}

export function CatalogToolbar({
	tab,
	canCreate,
	onTabChange,
	onCreate,
}: CatalogToolbarProps) {
	return (
		<div className={catalogStyles.actions}>
			<Button
				disabled={!canCreate}
				title={!canCreate ? "Создание недоступно по данным сервера" : undefined}
				variant="default"
				onClick={onCreate}
			>
				<IconPlus size={18} />
				<StableLabel variants={["Товар", "Категория"]}>
					{tab === "products" ? "Товар" : "Категория"}
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
	);
}
