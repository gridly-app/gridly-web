import { useState } from "react";
import {
	useWarehouseConnection,
	useWarehouseLiveSubscription,
} from "@/ports/warehouse";
import { FloatingAlerts } from "@/shared/ui/feedback";

export function ConnectionStatus({ warehouseId }: { warehouseId: string }) {
	useWarehouseLiveSubscription(warehouseId);
	const { data: disconnected } = useWarehouseConnection(warehouseId);
	return disconnected ? <ConnectionAlert /> : null;
}

function ConnectionAlert() {
	const [dismissed, setDismissed] = useState(false);
	if (dismissed) return null;

	return (
		<FloatingAlerts
			items={[
				{
					id: "warehouse-connection",
					tone: "warning",
					title: "Нет связи с потоком состояния склада",
					description:
						"Данные могут быть устаревшими. Gridly пытается восстановить связь.",
					onDismiss: () => setDismissed(true),
				},
			]}
		/>
	);
}
