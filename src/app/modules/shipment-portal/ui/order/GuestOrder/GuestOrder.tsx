import { useState } from "react";

import type { ShipmentProgressSlot } from "@/ports/shipment";
import { Feedback, RetryButton, Skeleton } from "@/shared/ui/feedback";
import { Select } from "@/shared/ui/forms";

import type { GuestShipmentApi } from "../../../api/guestShipmentApi";
import { guestShipmentView } from "../../../model/order/guestShipmentView";
import { useGuestShipment } from "../../../model/order/useGuestShipment";
import { GuestShipmentSections } from "../GuestShipmentSections/GuestShipmentSections";

import styles from "../../../shared.module.css";

export function GuestOrder({
	token,
	guestApi,
	progress,
}: {
	token: string;
	guestApi: GuestShipmentApi;
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
			action={<RetryButton onRetry={retry} />}
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
				onRetry={retry}
				isLoading={isLoading}
				token={token}
				downloadFile={guestApi.download}
				progress={progress}
			/>
		</>
	);
}
