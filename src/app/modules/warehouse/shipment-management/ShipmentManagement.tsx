import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { formatMoment } from "@/domain/shipment";
import { warehousePath } from "@/ports/navigation";
import { ApiError, type HttpClient } from "@/shared/http";
import { errorMessage } from "@/shared/lib";
import { Button } from "@/shared/ui/controls";
import { Feedback, RetryButton } from "@/shared/ui/feedback";

import {
	type ShipmentResource,
	useShipmentResource,
} from "./api/useShipmentResource";
import type { WorkingShipment } from "./model/shipment.dto.ts";
import { ShipmentDocumentsEditor } from "./ui/ShipmentDocumentsEditor/ShipmentDocumentsEditor";
import { ShipmentEditor } from "./ui/ShipmentEditor/ShipmentEditor";
import { ShipmentSharing } from "./ui/ShipmentSharing/ShipmentSharing";

import styles from "./shared.module.css";

export function ShipmentManagement({ http }: { http: HttpClient }) {
	const { warehouseId = "", orderId = "" } = useParams();
	const resource = useShipmentResource(http, warehouseId, orderId);
	const { query } = resource;
	const accessLost =
		query.error instanceof ApiError &&
		[401, 403, 404].includes(query.error.status);
	const shipment = accessLost ? undefined : query.data;
	const contentKey = JSON.stringify([warehouseId, orderId]);

	return (
		<div className={styles.page}>
			<Link to={warehousePath("standard", warehouseId, "outbound")}>
				← Заказы на отгрузку
			</Link>
			<h1>Отгрузка{shipment && ` · ${shipment.order.number}`}</h1>
			{query.isPending && (
				<Feedback tone="loading">Загружаем отгрузку…</Feedback>
			)}
			{!shipment && query.error && (
				<Feedback tone="error" action={<RetryButton onRetry={query.refetch} />}>
					{errorMessage(query.error)}
				</Feedback>
			)}
			{shipment && (
				<ManagementContent
					key={contentKey}
					shipment={shipment}
					resource={resource}
				/>
			)}
		</div>
	);
}

export type RunShipmentAction = (
	action: (signal: AbortSignal) => Promise<void>,
	options?: { refreshAfterWrite: boolean },
) => Promise<void>;

function ManagementContent({
	shipment,
	resource,
}: {
	shipment: WorkingShipment;
	resource: ShipmentResource;
}) {
	const [busy, setBusy] = useState(false);
	const [notice, setNotice] = useState("");
	const [writeError, setWriteError] = useState("");
	const [refreshError, setRefreshError] = useState("");
	const request = useRef<AbortController | null>(null);
	const canWrite = !busy && !refreshError;

	useEffect(() => () => request.current?.abort(), []);

	async function refresh(signal: AbortSignal) {
		setRefreshError("");

		try {
			await resource.refresh();
		} catch (error) {
			if (!signal.aborted) setRefreshError(errorMessage(error));
		}
	}

	const run: RunShipmentAction = async (
		action,
		{ refreshAfterWrite } = { refreshAfterWrite: false },
	) => {
		if (request.current || !canWrite) return;

		const controller = new AbortController();
		const signal = AbortSignal.any([
			controller.signal,
			AbortSignal.timeout(60000),
		]);

		request.current = controller;
		setBusy(true);
		setWriteError("");
		setNotice("");

		try {
			await action(signal);

			if (controller.signal.aborted) return;

			setNotice("Изменения сохранены.");

			if (refreshAfterWrite) await refresh(controller.signal);
		} catch (error) {
			if (!controller.signal.aborted) setWriteError(errorMessage(error));
		} finally {
			request.current = null;

			if (!controller.signal.aborted) setBusy(false);
		}
	};

	async function handleRefresh() {
		if (request.current) return;

		const controller = new AbortController();

		request.current = controller;
		setBusy(true);

		try {
			await refresh(controller.signal);
		} finally {
			request.current = null;

			if (!controller.signal.aborted) setBusy(false);
		}
	}

	function handleSave(body: Parameters<ShipmentResource["save"]>[0]) {
		return run((signal) => resource.save(body, signal));
	}

	return (
		<>
			<p>
				{shipment.order.recipient} · {shipment.order.warehouse_name} ·{" "}
				{shipment.order.time_zone}
			</p>
			{notice && <Feedback tone="success">{notice}</Feedback>}
			{writeError && <Feedback tone="error">{writeError}</Feedback>}
			{refreshError && (
				<Feedback tone="warning">
					Не удалось обновить данные отгрузки. {refreshError}
				</Feedback>
			)}
			<ShipmentEditor
				key={shipment.revision}
				shipment={shipment}
				busy={!canWrite}
				save={handleSave}
			/>
			<ShipmentSharing
				shipment={shipment}
				issueLink={resource.issueLink}
				revokeLink={resource.revokeLink}
				run={run}
				busy={!canWrite}
			/>
			<ShipmentDocumentsEditor
				documents={shipment.documents}
				timeZone={shipment.order.time_zone}
				uploadDocument={resource.uploadDocument}
				publishDocument={resource.publishDocument}
				run={run}
				busy={!canWrite}
			/>
			<Button variant="default" disabled={busy} onClick={handleRefresh}>
				Обновить данные
			</Button>
			<p>
				Данные заказа обновлены{" "}
				{formatMoment(shipment.order.updated_at, shipment.order.time_zone)}
			</p>
		</>
	);
}
