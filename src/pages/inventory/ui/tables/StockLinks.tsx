import { IconDots, IconPackage } from "@tabler/icons-react";
import { Link as RouterLink } from "react-router-dom";
import type { Order } from "@/entities/warehouse";
import { useWorkspaceMode } from "@/shared/auth";
import { warehousePath } from "@/shared/config";
import { Button } from "@/shared/ui/controls";
import {
	Menu,
	MenuLinkItem,
	MenuPopup,
	MenuTrigger,
} from "@/shared/ui/overlays";

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
	const related = orders.filter((order) =>
		order.lines.some((line) => line.product === productId),
	);
	return (
		<Menu>
			<MenuTrigger
				render={<Button variant="ghost" size="icon" tooltip={false} />}
				aria-label="Связи товара"
			>
				<IconDots size={18} />
			</MenuTrigger>
			<MenuPopup align="end">
				<MenuLinkItem
					render={
						<RouterLink
							to={{
								pathname: warehousePath(mode, warehouseId, "catalog"),
								search: new URLSearchParams({ product: productId }).toString(),
							}}
						/>
					}
				>
					<IconPackage size={16} /> Товар в каталоге
				</MenuLinkItem>
				{related.map((order) => (
					<MenuLinkItem
						key={order.id}
						render={
							<RouterLink
								to={{
									pathname: warehousePath(mode, warehouseId, order.kind),
									search: new URLSearchParams({ order: order.id }).toString(),
								}}
							/>
						}
					>
						{order.kind === "inbound" ? "Поставка" : "Отгрузка"} {order.number}
					</MenuLinkItem>
				))}
			</MenuPopup>
		</Menu>
	);
}
