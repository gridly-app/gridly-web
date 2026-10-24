import { IconPlus } from "@tabler/icons-react";
import { Button, SearchField } from "@/shared/ui";

import type { useOrderDialogs } from "../model/useOrderDialogs";
import type { useOrdersPage } from "../model/useOrdersPage";

export interface OrdersToolbarProps {
	model: Pick<
		ReturnType<typeof useOrdersPage>,
		"page" | "search" | "setSearch"
	> &
		Pick<ReturnType<typeof useOrderDialogs>, "setCreating">;
}

export function OrdersToolbar({ model }: OrdersToolbarProps) {
	const { setCreating, page, search, setSearch } = model;

	return (
		<>
			<Button variant="default" onClick={() => setCreating(true)}>
				<IconPlus size={18} />
				{page === "inbound" ? "Новая поставка" : "Новый заказ"}
			</Button>
			<SearchField value={search} onChange={setSearch} />
		</>
	);
}
