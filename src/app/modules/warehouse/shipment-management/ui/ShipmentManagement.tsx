import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { formatMoment } from "@/domain/shipment";
import { warehousePath } from "@/ports/navigation";
import { useWarehouseScopeId } from "@/ports/warehouse";
import { ApiError, type HttpClient, parseResponse } from "@/shared/http";
import { errorMessage } from "@/shared/lib";
import { Button } from "@/shared/ui/controls";
import { Feedback, RetryButton } from "@/shared/ui/feedback";
import {
	type WorkingShipment,
	workingShipmentSchema,
} from "../model/shipment.dto";
import { ShipmentEditor } from "./ShipmentEditor";
import styles from "./ShipmentManagement.module.css";
import { ShipmentSharing } from "./ShipmentSharing";

export function ShipmentManagement({ http }: { http: HttpClient }) {
	const { warehouseId = "", orderId = "" } = useParams();
	const path = `/warehouses/${encodeURIComponent(warehouseId)}/orders/${encodeURIComponent(orderId)}/shipment`;
	const queryClient = useQueryClient();
	const scopeId = useWarehouseScopeId();
	const queryKey = [scopeId, "shipment-management", warehouseId, orderId];
	const query = useQuery({
		queryKey,
		queryFn: async ({ signal }) =>
			parseResponse(
				workingShipmentSchema,
				await http.request(path, { signal }),
			),
		retry: false,
		refetchOnWindowFocus: false,
	});
	const accessLost =
		query.error instanceof ApiError &&
		[401, 403, 404].includes(query.error.status);
	return (
		<div className={styles.page}>
			<Link to={warehousePath("standard", warehouseId, "outbound")}>
				← Заказы на отгрузку
			</Link>
			<h1>
				Отгрузка
				{query.data && !accessLost ? ` · ${query.data.order.number}` : ""}
			</h1>
			{query.isPending && (
				<Feedback tone="loading">Загружаем отгрузку…</Feedback>
			)}
			{query.error && (
				<Feedback tone="error" action={<RetryButton onRetry={query.refetch} />}>
					{errorMessage(query.error)}
				</Feedback>
			)}
			{query.data && !accessLost && (
				<ManagementContent
					key={path}
					http={http}
					path={path}
					shipment={query.data}
					onSave={(data) => queryClient.setQueryData(queryKey, data)}
					refresh={async () => {
						await query.refetch({ throwOnError: true });
					}}
				/>
			)}
		</div>
	);
}

export type RunShipmentAction = (
	action: (signal: AbortSignal) => Promise<void>,
) => Promise<void>;

function ManagementContent({
	http,
	path,
	shipment,
	refresh,
	onSave,
}: {
	http: HttpClient;
	path: string;
	shipment: WorkingShipment;
	onSave: (data: WorkingShipment) => void;
	refresh: () => Promise<void>;
}) {
	const [busy, setBusy] = useState(false);
	const [notice, setNotice] = useState("");
	const [error, setError] = useState("");
	const request = useRef<AbortController | null>(null);
	useEffect(() => () => request.current?.abort(), []);
	const run: RunShipmentAction = async (action) => {
		if (request.current) return;
		const controller = new AbortController();
		request.current = controller;
		setBusy(true);
		setError("");
		setNotice("");
		try {
			await action(
				AbortSignal.any([controller.signal, AbortSignal.timeout(60000)]),
			);
			if (!controller.signal.aborted) setNotice("Изменения сохранены.");
		} catch (error) {
			if (!controller.signal.aborted) setError(errorMessage(error));
		} finally {
			request.current = null;
			if (!controller.signal.aborted) setBusy(false);
		}
	};
	return (
		<>
			<p>
				{shipment.order.recipient} · {shipment.order.warehouse_name} ·{" "}
				{shipment.order.time_zone}
			</p>
			{notice && <Feedback tone="success">{notice}</Feedback>}
			{error && <Feedback tone="error">{error}</Feedback>}
			<ShipmentEditor
				key={shipment.revision}
				shipment={shipment}
				busy={busy}
				save={(body) =>
					run(async (signal) => {
						onSave(
							parseResponse(
								workingShipmentSchema,
								await http.request(path, { method: "PUT", body, signal }),
							),
						);
					})
				}
			/>
			<ShipmentSharing
				http={http}
				path={path}
				shipment={shipment}
				run={run}
				busy={busy}
				refresh={refresh}
			/>
			<Button
				variant="default"
				disabled={busy}
				onClick={() => {
					setNotice("");
					setError("");
					void refresh().catch(() => undefined);
				}}
			>
				Обновить данные
			</Button>
			<p>
				Данные заказа обновлены{" "}
				{formatMoment(shipment.order.updated_at, shipment.order.time_zone)}
			</p>
		</>
	);
}
