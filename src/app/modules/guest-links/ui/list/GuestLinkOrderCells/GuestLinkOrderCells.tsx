import { adminLocation } from "@/ports/navigation";

import { Badge } from "@/shared/ui/dataDisplay";
import { Link } from "@/shared/ui/navigation";
import { managementStyles as styles } from "@/shared/ui/management";

import type { GuestLinkOrder } from "../../../model/guestLinkOrders";

import orderStyles from "./GuestLinkOrderCells.module.css";

export function GuestLinkOrderCells({
	orders,
	warehouseId,
}: {
	orders: GuestLinkOrder[];
	warehouseId: string;
}) {
	return (
		<div className={orderStyles.orderMarkers}>
			{orders.map(({ id, number, label }) => {
				const orderLocation = number
					? adminLocation("links", { warehouse_id: warehouseId, order: id })
					: undefined;

				return (
					<Badge
						key={id}
						tone="neutral"
						className={orderStyles.orderMarker}
						title={label}
					>
						{orderLocation ? (
							<Link className={styles.link} to={orderLocation}>
								{label}
							</Link>
						) : (
							label
						)}
					</Badge>
				);
			})}
		</div>
	);
}
