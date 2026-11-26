import { useState } from "react";
import { useLocation } from "react-router-dom";

import { environment } from "@/shared/config";
import { FetchHttpClient } from "@/shared/http";
import type { ShipmentProgressSlot } from "@/ports/shipment";
import { Button } from "@/shared/ui/controls";
import { Feedback, Skeleton } from "@/shared/ui/feedback";
import { Select } from "@/shared/ui/forms";

import { GuestShipmentApi } from "./api/guestShipmentApi";
import { guestShipmentView } from "./model/order/guestShipmentView";
import { useGuestShipment } from "./model/order/useGuestShipment";
import { ShipmentCalendar } from "./ui/calendar/ShipmentCalendar/ShipmentCalendar";
import { ShipmentDocuments } from "./ui/documents/ShipmentDocuments/ShipmentDocuments";
import { ShipmentItems } from "./ui/order/ShipmentItems/ShipmentItems";
import { ShipmentSummary } from "./ui/summary/ShipmentSummary/ShipmentSummary";

import styles from "./shared.module.css";

const guestApi = new GuestShipmentApi(
	new FetchHttpClient(environment.apiBaseUrl, undefined, { refresh: false }),
);

export function ShipmentPortal({
	progress,
}: {
	progress: ShipmentProgressSlot;
}) {
	const { hash } = useLocation();
	const token = new URLSearchParams(hash.slice(1)).get("token") ?? "";

	return (
		<main className={styles.page}>
			<header className={styles.top}>
				<strong>Gridly</strong>
				<span>Кабинет отгрузок</span>
			</header>
			<GuestOrder key={token} token={token} progress={progress} />
		</main>
	);
}

function GuestOrder({
	token,
	progress,
}: {
	token: string;
	progress: ShipmentProgressSlot;
}) {
	const { snapshot, error, isLoading, retry } = useGuestShipment(
		token,
		guestApi.read,
	);
	const [selectedId, setSelectedId] = useState("");

	if (!token || error === "denied") {
		return (
			<Feedback tone="warning" title="Заказ недоступен">
				Проверьте ссылку или запросите новую у отправителя.
			</Feedback>
		);
	}

	const failureTitle = snapshot
		? "Данные могли устареть"
		: "Не удалось загрузить заказ";
	const failureMessage = snapshot
		? "Показываем последнее успешное обновление."
		: "Попробуйте загрузить заказ ещё раз.";
	const failure = error && (
		<Feedback
			tone="warning"
			title={failureTitle}
			action={<Button onClick={retry}>Повторить</Button>}
		>
			{failureMessage}
		</Feedback>
	);

	if (!snapshot) {
		if (isLoading) return <Skeleton layout="page" label="Загружаем заказ…" />;

		return failure;
	}

	const orders = snapshot.data.orders;
	const selected = orders.find((order) => order.id === selectedId) ?? orders[0];
	const orderOptions = orders.map(({ id, order }) => ({
		value: id,
		label: order.number,
	}));

	if (!selected) {
		return (
			<>
				{failure}
				<Feedback tone="empty">По этой ссылке нет доступных заказов.</Feedback>
			</>
		);
	}

	const view = guestShipmentView(selected);
	const canSelectOrder = orders.length > 1;

	return (
		<>
			{failure}
			{canSelectOrder && (
				<div className={styles.panel}>
					<span>Заказ</span>
					<Select
						aria-label="Заказ"
						value={selected.id}
						onValueChange={setSelectedId}
						options={orderOptions}
					/>
				</div>
			)}
			<GuestShipmentSections
				key={selected.id}
				view={view}
				checkedAt={snapshot.checkedAt}
				retry={retry}
				isLoading={isLoading}
				token={token}
				progress={progress}
			/>
		</>
	);
}

function GuestShipmentSections({
	view,
	checkedAt,
	retry,
	isLoading,
	token,
	progress: ShipmentProgress,
}: {
	view: ReturnType<typeof guestShipmentView>;
	checkedAt: number;
	retry: () => void;
	isLoading: boolean;
	token: string;
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
				retry={retry}
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
					onAccessDenied={retry}
					downloadFile={guestApi.download}
				/>
			)}
		</>
	);
}
