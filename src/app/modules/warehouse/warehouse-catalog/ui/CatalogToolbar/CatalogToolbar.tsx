import { IconPlus } from "@tabler/icons-react";

import { Button, StableLabel } from "@/shared/ui/controls";
import { SegmentedControl } from "@/shared/ui/navigation";

import type { CatalogTab } from "../../model/catalog";

import styles from "./CatalogToolbar.module.css";

const tabItems = [
	{ value: "products", label: "Товары" },
	{ value: "categories", label: "Категории" },
] as const;

export function CatalogToolbar({
	tab,
	canCreate,
	onTabChange,
	onCreate,
}: {
	tab: CatalogTab;
	canCreate: boolean;
	onTabChange: (tab: CatalogTab) => void;
	onCreate: () => void;
}) {
	const createLabel = tab === "products" ? "Товар" : "Категория";
	const createHint = canCreate
		? undefined
		: "Создание недоступно по данным сервера";

	return (
		<div className={styles.actions}>
			<Button
				disabled={!canCreate}
				title={createHint}
				variant="default"
				onClick={onCreate}
			>
				<IconPlus size={18} />
				<StableLabel variants={["Товар", "Категория"]}>
					{createLabel}
				</StableLabel>
			</Button>
			<SegmentedControl
				aria-label="Раздел каталога"
				value={tab}
				onValueChange={onTabChange}
				items={tabItems}
			/>
		</div>
	);
}
