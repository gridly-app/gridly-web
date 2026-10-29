import { IconPlus } from "@tabler/icons-react";
import { Button, SearchField } from "@/shared/ui";

import type { useOrderDialogs } from "../model/useOrderDialogs";
import type { useOrdersPage } from "../model/useOrdersPage";

export interface OrdersToolbarProps {
	model: Pick<
		ReturnType<typeof useOrdersPage>,
		"page" | "search" | "setSearch" | "canCreate"
	> &
		Pick<ReturnType<typeof useOrderDialogs>, "openCreation">;
}

export function OrdersToolbar({ model }: OrdersToolbarProps) {
	const { openCreation, page, search, setSearch } = model;

	return (
		<>
			<Button
				disabled={!model.canCreate}
				title={
					!model.canCreate ? "Создание недоступно по данным сервера" : undefined
				}
				variant="default"
				onClick={openCreation}
			>
				<IconPlus size={18} />
				{page === "inbound" ? "Новая поставка" : "Новый заказ"}
			</Button>
			<SearchField value={search} onChange={setSearch} />
		</>
	);
}
