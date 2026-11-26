import { useState } from "react";
import { Link, useParams } from "react-router-dom";

import { warehousePath } from "@/ports/navigation";
import { useOrder, useWarehouseScopeId } from "@/ports/warehouse";
import { ApiError, type FileHttpClient } from "@/shared/http";
import { errorMessage, formatMoment } from "@/shared/lib";
import { Button } from "@/shared/ui/controls";
import { Feedback, RetryButton } from "@/shared/ui/feedback";

import {
	type ShipmentResource,
	useShipmentResource,
} from "./api/useShipmentResource";
import type { WorkingShipment } from "./model/shipment.dto";
import { useShipmentActions } from "./model/useShipmentActions";
import { ShipmentDocumentsEditor } from "./ui/ShipmentDocumentsEditor/ShipmentDocumentsEditor";
import { ShipmentEditor } from "./ui/ShipmentEditor/ShipmentEditor";
import { ShipmentReconciliation } from "./ui/ShipmentReconciliation/ShipmentReconciliation";
import { ShipmentSharing } from "./ui/ShipmentSharing/ShipmentSharing";

import styles from "./shared.module.css";

export function ShipmentManagement({ http }: { http: FileHttpClient }) {
	const { warehouseId = "", orderId = "" } = useParams();
	const order = useOrder(warehouseId, orderId);

	if (order.isPending)
		return <Feedback tone="loading">Загружаем заказ…</Feedback>;
	if (order.error) {
		return (
			<Feedback tone="error" action={<RetryButton onRetry={order.refetch} />}>
				{errorMessage(order.error)}
			</Feedback>
		);
	}
	if (!order.data || order.data.kind !== "outbound") {
		return (
			<Feedback tone="info">
				Редактор отгрузки доступен только для исходящих заказов.
			</Feedback>
		);
	}

	const canIssueLink = order.data.status !== "draft";

	return (
		<OutboundManagement
			http={http}
			warehouseId={warehouseId}
			orderId={orderId}
			canIssueLink={canIssueLink}
		/>
	);
}

function OutboundManagement({
	http,
	warehouseId,
	orderId,
	canIssueLink,
}: {
	http: FileHttpClient;
	warehouseId: string;
	orderId: string;
	canIssueLink: boolean;
}) {
	const scopeId = useWarehouseScopeId();
	const resource = useShipmentResource(http, warehouseId, orderId);
	const { query } = resource;
	const accessLost =
		query.error instanceof ApiError &&
		[401, 403, 404].includes(query.error.status);
	const shipment = accessLost ? undefined : query.data;
	const contentKey = JSON.stringify([scopeId, warehouseId, orderId]);

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
					warehouseId={warehouseId}
					orderId={orderId}
					canIssueLink={canIssueLink}
					resource={resource}
				/>
			)}
		</div>
	);
}

function ManagementContent({
	shipment,
	warehouseId,
	orderId,
	canIssueLink,
	resource,
}: {
	shipment: WorkingShipment;
	warehouseId: string;
	orderId: string;
	canIssueLink: boolean;
	resource: ShipmentResource;
}) {
	const [editorVersion, setEditorVersion] = useState(0);
	const {
		busy,
		canWrite,
		notice,
		writeError,
		refreshError,
		run,
		handleRefresh,
	} = useShipmentActions(resource.refresh);

	function handleSave(body: Parameters<ShipmentResource["save"]>[0]) {
		return run(async (signal) => {
			await resource.save(body, signal);

			setEditorVersion((version) => version + 1);
		});
	}

	return (
		<>
			<p>
				{shipment.order.recipient} · {shipment.order.warehouse_name} ·{" "}
				{shipment.order.time_zone}
			</p>
			{notice && <Feedback tone="success">{notice}</Feedback>}
			{writeError && <Feedback tone="error">{writeError}</Feedback>}
			{resource.creation?.status === "unknown" && (
				<Feedback tone="warning">
					Сервер мог сохранить{" "}
					{resource.creation.kind === "link" ? "ссылку" : "документ"}. Исход
					неизвестен. Новая выдача ссылки и загрузка документа заблокированы до
					сверки операции с сервером.
				</Feedback>
			)}
			{refreshError && (
				<Feedback tone="warning">
					Не удалось обновить данные отгрузки. {refreshError}
				</Feedback>
			)}
			<ShipmentEditor
				key={editorVersion}
				shipment={shipment}
				busy={!canWrite}
				save={handleSave}
			/>
			<ShipmentReconciliation shipment={shipment} />
			<ShipmentSharing
				warehouseId={warehouseId}
				orderId={orderId}
				shipment={shipment}
				canIssueLink={canIssueLink}
				issueLink={resource.issueLink}
				revokeLink={resource.revokeLink}
				run={run}
				busy={!canWrite}
				attempt={resource.creation}
				retryLink={resource.retryLink}
			/>
			<ShipmentDocumentsEditor
				shipment={shipment}
				uploadDocument={resource.uploadDocument}
				publishDocument={resource.publishDocument}
				run={run}
				busy={!canWrite}
				creationBlocked={!!resource.creation}
				canRetryUpload={
					resource.creation?.kind === "document" &&
					resource.creation.status === "unknown"
				}
				hasUploadFile={resource.hasUploadFile}
				retryUpload={resource.retryUpload}
				downloadDocument={resource.downloadDocument}
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
