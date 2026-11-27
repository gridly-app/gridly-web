import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";

import { shipmentSchema } from "@/domain/shipment";
import { warehousePath } from "@/ports/navigation";
import { useWarehouseScopeId } from "@/ports/warehouse";
import { type HttpClient, parseResponse } from "@/shared/http";
import { errorMessage } from "@/shared/lib";
import { Feedback, RetryButton } from "@/shared/ui/feedback";

import { shipmentPath } from "../../api/shipmentPath";
import { ShipmentFactExport } from "../ShipmentFactExport/ShipmentFactExport";
import { ShipmentReconciliation } from "../ShipmentReconciliation/ShipmentReconciliation";

import styles from "../../shared.module.css";

const sandboxShipmentSchema = shipmentSchema.pick({
	order: true,
	items: true,
	plan: true,
	actual: true,
});

export function SandboxShipment({
	http,
	warehouseId,
	orderId,
}: {
	http: HttpClient;
	warehouseId: string;
	orderId: string;
}) {
	const scopeId = useWarehouseScopeId();
	const query = useQuery({
		queryKey: [scopeId, "sandbox-shipment", warehouseId, orderId],
		queryFn: async ({ signal }) => {
			const response = await http.request(shipmentPath(warehouseId, orderId), {
				signal,
			});

			return parseResponse(sandboxShipmentSchema, response);
		},
		retry: false,
	});
	const shipment = query.error ? undefined : query.data;
	const title = shipment ? `Отгрузка · ${shipment.order.number}` : "Отгрузка";

	return (
		<div className={styles.page}>
			<Link to={warehousePath("sandbox", warehouseId, "outbound")}>
				← Заказы на отгрузку
			</Link>
			<h1>{title}</h1>
			{query.isPending && (
				<Feedback tone="loading">Загружаем отгрузку…</Feedback>
			)}
			{query.error && (
				<Feedback tone="error" action={<RetryButton onRetry={query.refetch} />}>
					{errorMessage(query.error)}
				</Feedback>
			)}
			{shipment && (
				<>
					<ShipmentReconciliation shipment={shipment} />
					<section
						className={styles.panel}
						aria-labelledby="sandbox-shipment-documents"
					>
						<h2 id="sandbox-shipment-documents">Документы заказа</h2>
						<ShipmentFactExport shipment={shipment} />
						{shipment.actual.length === 0 && (
							<p>Факт отгрузки пока не внесён.</p>
						)}
					</section>
				</>
			)}
		</div>
	);
}
