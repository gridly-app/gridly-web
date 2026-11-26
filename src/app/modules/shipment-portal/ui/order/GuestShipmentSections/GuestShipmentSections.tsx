import type { ShipmentProgressSlot } from "@/ports/shipment";

import type { GuestShipmentApi } from "../../../api/guestShipmentApi";
import type { guestShipmentView } from "../../../model/order/guestShipmentView";
import { ShipmentCalendar } from "../../calendar/ShipmentCalendar/ShipmentCalendar";
import { ShipmentDocuments } from "../../documents/ShipmentDocuments/ShipmentDocuments";
import { ShipmentItems } from "../ShipmentItems/ShipmentItems";
import { ShipmentSummary } from "../../summary/ShipmentSummary/ShipmentSummary";

export function GuestShipmentSections({
	view,
	checkedAt,
	onRetry,
	isLoading,
	token,
	downloadFile,
	progress: ShipmentProgress,
}: {
	view: ReturnType<typeof guestShipmentView>;
	checkedAt: number;
	onRetry: () => void;
	isLoading: boolean;
	token: string;
	downloadFile: GuestShipmentApi["download"];
	progress: ShipmentProgressSlot;
}) {
	const { order, warehouse, calendar, items, milestones, documents } = view;

	return (
		<>
			<ShipmentSummary
				order={order}
				warehouse={warehouse}
				plan={calendar?.plan ?? null}
				checkedAt={checkedAt}
				onRefresh={onRetry}
				isLoading={isLoading}
			/>
			{milestones && (
				<ShipmentProgress
					shipment={{ order, milestones }}
					title="Этапы заказа"
				/>
			)}
			{calendar && (
				<ShipmentCalendar
					shipment={{ order, plan: calendar.plan, actual: calendar.actual }}
					items={calendar.items}
					priority={warehouse?.priority ?? null}
					showPriority={warehouse !== null}
				/>
			)}
			{items && <ShipmentItems items={items} />}
			{documents && (
				<ShipmentDocuments
					documents={documents}
					timeZone={order.time_zone}
					token={token}
					onAccessDenied={onRetry}
					downloadFile={downloadFile}
				/>
			)}
		</>
	);
}
