import { IconDots, IconPackage } from "@tabler/icons-react";
import { Link as RouterLink } from "react-router-dom";

import type { Order } from "@/domain/warehouse";
import { warehousePath } from "@/ports/navigation";
import { useWorkspaceMode } from "@/ports/session";
import { Button } from "@/shared/ui/controls";
import {
	Menu,
	MenuLinkItem,
	MenuPopup,
	MenuTrigger,
} from "@/shared/ui/overlays";

import { orderLink } from "../../lib/orderLink";

const orderKindLabels = { inbound: "Поставка", outbound: "Отгрузка" };

export function StockLinks({
	warehouseId,
	productId,
	orders,
}: {
	warehouseId: string;
	productId: string;
	orders: readonly Order[];
}) {
	const mode = useWorkspaceMode();
	const relatedOrders = orders.filter((order) =>
		order.lines.some((line) => line.product === productId),
	);
	const catalogLink = {
		pathname: warehousePath(mode, warehouseId, "catalog"),
		search: new URLSearchParams({ product: productId }).toString(),
	};

	return (
		<Menu>
			<MenuTrigger
				render={<Button variant="ghost" size="icon" tooltip={false} />}
				aria-label="Связи товара"
			>
				<IconDots size={18} />
			</MenuTrigger>
			<MenuPopup align="end">
				<MenuLinkItem render={<RouterLink to={catalogLink} />}>
					<IconPackage size={16} /> Товар в каталоге
				</MenuLinkItem>
				{relatedOrders.map((order) => (
					<MenuLinkItem
						key={order.id}
						render={
							<RouterLink
								to={orderLink(mode, warehouseId, order.kind, order.id)}
							/>
						}
					>
						{orderKindLabels[order.kind]} {order.number}
					</MenuLinkItem>
				))}
			</MenuPopup>
		</Menu>
	);
}
