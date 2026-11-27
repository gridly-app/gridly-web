import { useState } from "react";
import { Link, useParams } from "react-router-dom";

import { warehousePath } from "@/ports/navigation";
import { useWorkspaceMode } from "@/ports/session";
import { useOrder, useWarehouseScopeId } from "@/ports/warehouse";
import { ApiError, type FileHttpClient } from "@/shared/http";
import { errorMessage, formatMoment } from "@/shared/lib";
import { Button } from "@/shared/ui/controls";
import { Feedback, RetryButton } from "@/shared/ui/feedback";

import type { WorkingShipment } from "./api/shipment.dto";
import {
	type ShipmentResource,
	useShipmentResource,
} from "./api/useShipmentResource";
import type { ShipmentDraft } from "./model/shipmentEditor";
import { useShipmentActions } from "./model/useShipmentActions";
import { SandboxShipment } from "./ui/SandboxShipment/SandboxShipment";
import { ShipmentDocumentsEditor } from "./ui/ShipmentDocumentsEditor/ShipmentDocumentsEditor";
import { ShipmentEditor } from "./ui/ShipmentEditor/ShipmentEditor";
import { ShipmentReconciliation } from "./ui/ShipmentReconciliation/ShipmentReconciliation";
import { ShipmentSharing } from "./ui/ShipmentSharing/ShipmentSharing";

import styles from "./shared.module.css";

const lostAccessStatuses = [401, 403, 404];

export function ShipmentManagement({ http }: { http: FileHttpClient }) {
	const { warehouseId = "", orderId = "" } = useParams();
	const mode = useWorkspaceMode();
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

	if (order.data?.kind !== "outbound") {
		return (
			<Feedback tone="info">
				Редактор отгрузки доступен только для исходящих заказов.
			</Feedback>
		);
	}

	if (mode === "sandbox") {
		return (
			<SandboxShipment
				key={orderId}
				http={http}
				warehouseId={warehouseId}
				orderId={orderId}
			/>
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
	const isAccessLost =
		query.error instanceof ApiError &&
		lostAccessStatuses.includes(query.error.status);
	const shipment = isAccessLost ? undefined : query.data;
	const title = shipment ? `Отгрузка · ${shipment.order.number}` : "Отгрузка";
	const contentKey = JSON.stringify([scopeId, warehouseId, orderId]);

	return (
		<div className={styles.page}>
			<Link to={warehousePath("standard", warehouseId, "outbound")}>
				← Заказы на отгрузку
			</Link>
			<h1>{title}</h1>
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
		isBusy,
		canWrite,
		notice,
		writeError,
		refreshError,
		run,
		handleRefresh,
	} = useShipmentActions(resource.refresh);
	const { order } = shipment;
	const { creation } = resource;
	const isOutcomeUnknown = creation?.status === "unknown";
	const pendingObject = creation?.kind === "link" ? "ссылку" : "документ";
	const canRetryUpload = isOutcomeUnknown && creation.kind === "document";

	function handleSave(body: ShipmentDraft) {
		return run(async (signal) => {
			await resource.save(body, signal);

			setEditorVersion((version) => version + 1);
		});
	}

	return (
		<>
			<p>
				{order.recipient} · {order.warehouse_name} · {order.time_zone}
			</p>
			{notice && <Feedback tone="success">{notice}</Feedback>}
			{writeError && <Feedback tone="error">{writeError}</Feedback>}
			{isOutcomeUnknown && (
				<Feedback tone="warning">
					Сервер мог сохранить {pendingObject}. Исход неизвестен. Новая выдача
					ссылки и загрузка документа заблокированы до сверки операции с
					сервером.
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
				isBusy={!canWrite}
				onSave={handleSave}
			/>
			<ShipmentReconciliation shipment={shipment} />
			<ShipmentSharing
				warehouseId={warehouseId}
				orderId={orderId}
				shipment={shipment}
				canIssueLink={canIssueLink}
				attempt={creation}
				isBusy={!canWrite}
				run={run}
				issueLink={resource.issueLink}
				revokeLink={resource.revokeLink}
				retryLink={resource.retryLink}
			/>
			<ShipmentDocumentsEditor
				shipment={shipment}
				isBusy={!canWrite}
				isCreationBlocked={Boolean(creation)}
				canRetryUpload={canRetryUpload}
				hasUploadFile={resource.hasUploadFile}
				run={run}
				uploadDocument={resource.uploadDocument}
				publishDocument={resource.publishDocument}
				retryUpload={resource.retryUpload}
				downloadDocument={resource.downloadDocument}
			/>
			<Button variant="default" disabled={isBusy} onClick={handleRefresh}>
				Обновить данные
			</Button>
			<p>
				Данные заказа обновлены{" "}
				{formatMoment(order.updated_at, order.time_zone)}
			</p>
		</>
	);
}
