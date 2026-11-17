import { useState } from "react";
import { useLocation } from "react-router-dom";

import type { ShipmentProgressSlot } from "@/ports/shipment";
import { Button } from "@/shared/ui/controls";
import { Feedback, Skeleton } from "@/shared/ui/feedback";
import { Select } from "@/shared/ui/forms";

import { guestShipmentView } from "./model/guestShipmentView";
import { useGuestShipment } from "./model/useGuestShipment";
import { ShipmentCalendar } from "./ui/ShipmentCalendar/ShipmentCalendar";
import { ShipmentDocuments } from "./ui/ShipmentDocuments/ShipmentDocuments";
import { ShipmentItems } from "./ui/ShipmentItems/ShipmentItems";
import { ShipmentSummary } from "./ui/ShipmentSummary/ShipmentSummary";

import styles from "./shared.module.css";

export function ShipmentPortal({
	progress,
}: {
	progress: ShipmentProgressSlot;
}) {
	const { hash } = useLocation();
	const token = new URLSearchParams(hash.slice(1)).get("token") ?? "";
	return <GuestOrder key={token} token={token} progress={progress} />;
}

function GuestOrder({
	token,
	progress,
}: {
	token: string;
	progress: ShipmentProgressSlot;
}) {
	const { data, checkedAt, error, loading, retry } = useGuestShipment(token);
	const [selectedId, setSelectedId] = useState("");
	const selected =
		data?.orders.find((order) => order.id === selectedId) ?? data?.orders[0];
	const view = selected ? guestShipmentView(selected) : null;

	return (
		<main className={styles.page}>
			<header className={styles.top}>
				<strong>Gridly</strong>
				<span>Кабинет отгрузок</span>
			</header>
			{!token || error === "denied" ? (
				<Feedback tone="warning" title="Заказ недоступен">
					Проверьте ссылку или запросите новую у отправителя.
				</Feedback>
			) : (
				<>
					{error && (
						<Feedback
							tone="warning"
							title={
								data ? "Данные могли устареть" : "Не удалось загрузить заказ"
							}
							action={<Button onClick={retry}>Повторить</Button>}
						>
							{data
								? "Показываем последнее успешное обновление."
								: "Попробуйте загрузить заказ ещё раз."}
						</Feedback>
					)}
					{loading && !data && !error && (
						<Skeleton layout="page" label="Загружаем заказ…" />
					)}
					{data && data.orders.length > 1 && (
						<div className={styles.panel}>
							<span>Заказ</span>
							<Select
								aria-label="Заказ"
								value={selected?.id ?? ""}
								onValueChange={setSelectedId}
								options={data.orders.map(({ id, order }) => ({
									value: id,
									label: order.number,
								}))}
							/>
						</div>
					)}
					{data && !selected && (
						<Feedback tone="empty">
							По этой ссылке нет доступных заказов.
						</Feedback>
					)}
					{view && selected && (
						<GuestShipmentSections
							key={selected.id}
							view={view}
							checkedAt={checkedAt ?? 0}
							retry={retry}
							loading={loading}
							token={token}
							progress={progress}
						/>
					)}
				</>
			)}
		</main>
	);
}

function GuestShipmentSections({
	view,
	checkedAt,
	retry,
	loading,
	token,
	progress: ShipmentProgress,
}: {
	view: ReturnType<typeof guestShipmentView>;
	checkedAt: number;
	retry: () => void;
	loading: boolean;
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
				loading={loading}
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
					detailedItems={items ?? []}
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
					refresh={retry}
				/>
			)}
		</>
	);
}
