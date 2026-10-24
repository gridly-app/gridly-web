import { selectOrdersLive, useLiveWarehouseScope } from "@/entities/warehouse";
import { DataPanel } from "@/shared/ui";
import { useOrderDialogs } from "../model/useOrderDialogs";
import type { OrdersPageOptions } from "../model/useOrdersPage";
import { useOrdersPage } from "../model/useOrdersPage";
import { OrderCreationDialog } from "./OrderCreationDialog";
import { OrderDetailDialog } from "./OrderDetailDialog";
import { OrdersTable } from "./OrdersTable";
import { OrdersToolbar } from "./OrdersToolbar";

export type OrdersPageProps = OrdersPageOptions;

export function OrdersPage(props: OrdersPageProps) {
	const { warehouse, execute, command, pending } =
		useLiveWarehouseScope(selectOrdersLive);
	const model = useOrdersPage({ ...props, warehouse, command, pending });
	const dialogs = useOrderDialogs(warehouse, execute);

	return (
		<>
			<DataPanel
				empty={model.empty}
				toolbar={
					<OrdersToolbar
						model={{ ...model, setCreating: dialogs.setCreating }}
					/>
				}
			>
				<OrdersTable model={{ ...model, setDetail: dialogs.setDetail }} />
			</DataPanel>
			<OrderCreationDialog
				model={{ ...dialogs, page: props.kind, w: warehouse, pending }}
			/>
			<OrderDetailDialog
				model={{ ...dialogs, w: warehouse, pending, execute }}
			/>
		</>
	);
}
