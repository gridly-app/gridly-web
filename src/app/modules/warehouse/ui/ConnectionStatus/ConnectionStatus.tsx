import { useState } from "react";

import {
	useWarehouseConnection,
	useWarehouseLiveSubscription,
} from "@/ports/warehouse";
import { FloatingAlerts } from "@/shared/ui/feedback";

export function ConnectionStatus({ warehouseId }: { warehouseId: string }) {
	useWarehouseLiveSubscription(warehouseId);

	const { data: isDisconnected } = useWarehouseConnection(warehouseId);

	return isDisconnected ? <ConnectionAlert /> : null;
}

function ConnectionAlert() {
	const [isDismissed, setIsDismissed] = useState(false);

	if (isDismissed) return null;

	function handleDismiss() {
		setIsDismissed(true);
	}

	const alert = {
		id: "warehouse-connection",
		tone: "warning",
		title: "Нет связи с потоком состояния склада",
		description:
			"Данные могут быть устаревшими. Gridly пытается восстановить связь.",
		onDismiss: handleDismiss,
	} as const;

	return <FloatingAlerts items={[alert]} />;
}
