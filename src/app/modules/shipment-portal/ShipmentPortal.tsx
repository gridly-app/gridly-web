import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import {
	categories,
	formatMoment,
	formatUnit,
	priorities,
	type Shipment,
} from "@/domain/shipment";
import type { ShipmentProgressSlot } from "@/ports/shipment";
import { saveResponseFile } from "@/shared/http";
import { Button } from "@/shared/ui/controls";
import { Badge } from "@/shared/ui/dataDisplay";
import { Feedback, Skeleton } from "@/shared/ui/feedback";
import { Select } from "@/shared/ui/forms";
import type { GuestShipment } from "./model/guestShipment.dto";
import {
	accessDenied,
	guestDownload,
	useGuestShipment,
} from "./model/useGuestShipment";
import styles from "./ShipmentPortal.module.css";
import { ShipmentCalendar } from "./ui/ShipmentCalendar";

const states = {
	active: "В исполнении",
	on_hold: "Приостановлен",
	cancelled: "Отменён",
	delivered: "Доставлен",
};

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
	const sections = new Set(selected?.sections);
	const shipment: Shipment | undefined = selected && {
		order: selected.order,
		warehouse: (sections.has("warehouse") && selected.warehouse) || {
			priority: null,
			quantities: [],
		},
		plan: (sections.has("calendar") && selected.plan) || [],
		actual: (sections.has("calendar") && selected.actual) || [],
		items: (sections.has("items") && selected.items) || [],
		milestones: (sections.has("milestones") && selected.milestones) || [],
		documents: (sections.has("documents") && selected.documents) || [],
	};
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
					{shipment && selected && (
						<GuestShipmentSections
							key={selected.id}
							access={selected}
							shipment={shipment}
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
	access,
	shipment,
	checkedAt,
	retry,
	loading,
	token,
	progress: ShipmentProgress,
}: {
	progress: ShipmentProgressSlot;
	access: GuestShipment;
	shipment: Shipment;
	checkedAt: number;
	retry: () => void;
	loading: boolean;
	token: string;
}) {
	const sections = new Set(access.sections);
	return (
		<>
			<Summary
				shipment={shipment}
				checkedAt={checkedAt}
				retry={retry}
				loading={loading}
				showWarehouse={sections.has("warehouse")}
				showCalendar={sections.has("calendar")}
			/>
			{sections.has("milestones") && (
				<ShipmentProgress shipment={shipment} title="Этапы заказа" />
			)}
			{sections.has("calendar") && (
				<ShipmentCalendar
					shipment={shipment}
					items={access.calendar_items ?? shipment.items}
					showPriority={sections.has("warehouse")}
				/>
			)}
			{sections.has("items") && <Items shipment={shipment} />}
			{sections.has("documents") && (
				<Documents shipment={shipment} token={token} refresh={retry} />
			)}
		</>
	);
}

function Summary({
	shipment,
	checkedAt,
	retry,
	loading,
	showWarehouse,
	showCalendar,
}: {
	shipment: Shipment;
	checkedAt: number;
	retry: () => void;
	loading: boolean;
	showWarehouse: boolean;
	showCalendar: boolean;
}) {
	const { order, warehouse } = shipment;
	const plannedDates = shipment.plan.map((row) => row.date).sort();
	return (
		<section className={styles.hero} aria-labelledby="shipment-heading">
			<div className={styles.heading}>
				<div>
					<Badge tone={order.state === "delivered" ? "success" : "neutral"}>
						{states[order.state]}
					</Badge>
					<h1 id="shipment-heading">Заказ {order.number}</h1>
					<p>
						{order.recipient} · {order.warehouse_name}
					</p>
				</div>
				<Button variant="secondary" onClick={retry} disabled={loading}>
					Обновить
				</Button>
			</div>
			{order.status_reason && (
				<Feedback tone="warning">{order.status_reason}</Feedback>
			)}
			<dl className={styles.facts}>
				<div>
					<dt>Дата заказа</dt>
					<dd>{formatMoment(order.created_at, order.time_zone)}</dd>
				</div>
				{showCalendar && (
					<div>
						<dt>План отгрузки</dt>
						<dd>
							{plannedDates.length
								? [...new Set([plannedDates[0], plannedDates.at(-1)])].join(
										" — ",
									)
								: "Не запланировано"}
						</dd>
					</div>
				)}
				<div>
					<dt>Данные заказа обновлены</dt>
					<dd>{formatMoment(order.updated_at, order.time_zone)}</dd>
				</div>
				<div>
					<dt>Последняя загрузка</dt>
					<dd>{formatMoment(checkedAt, order.time_zone)}</dd>
				</div>
			</dl>
			{showWarehouse && (
				<>
					<h2>Готовность на складе</h2>
					<p>
						Приоритет ·{" "}
						{warehouse.priority ? priorities[warehouse.priority] : "Не указан"}
					</p>
					{warehouse.quantities.length ? (
						<div className={styles.scroll}>
							<table className={styles.table}>
								<thead>
									<tr>
										<th>Единица</th>
										<th>Готово</th>
										<th>В обработке</th>
										<th>Осталось отгрузить</th>
									</tr>
								</thead>
								<tbody>
									{warehouse.quantities.map((row) => (
										<tr key={row.unit}>
											<th scope="row">{formatUnit(row.unit)}</th>
											<td>{row.ready_quantity}</td>
											<td>{row.processing_quantity}</td>
											<td>{row.remaining_quantity}</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					) : (
						<p>Данные о готовности ещё не внесены.</p>
					)}
				</>
			)}
		</section>
	);
}

function Items({ shipment }: { shipment: Shipment }) {
	return (
		<section className={styles.panel}>
			<h2>Номенклатура</h2>
			{shipment.items.length ? (
				<div className={styles.scroll}>
					<table className={styles.table}>
						<thead>
							<tr>
								<th>Код</th>
								<th>Наименование</th>
								<th>Марка / модель</th>
								<th>Количество</th>
								<th>Упаковка</th>
								<th>Исполнение</th>
							</tr>
						</thead>
						<tbody>
							{shipment.items.map((item) => (
								<tr key={item.order_line_id}>
									<td>{item.sku}</td>
									<th scope="row">{item.name}</th>
									<td>{item.grade ?? "Не указана"}</td>
									<td>
										{item.quantity} {formatUnit(item.unit)}
									</td>
									<td>{item.packaging ?? "Не указана"}</td>
									<td>{item.variant ?? "Не указано"}</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			) : (
				<p>Состав заказа ещё не внесён.</p>
			)}
		</section>
	);
}

function Documents({
	shipment,
	token,
	refresh,
}: {
	shipment: Shipment;
	token: string;
	refresh: () => void;
}) {
	const [pending, setPending] = useState("");
	const [error, setError] = useState("");
	const request = useRef<AbortController | null>(null);
	useEffect(() => () => request.current?.abort(), []);
	async function download(id: string, name: string) {
		if (request.current) return;
		const controller = new AbortController();
		request.current = controller;
		setPending(id);
		setError("");
		try {
			const signal = AbortSignal.any([
				controller.signal,
				AbortSignal.timeout(60000),
			]);
			await saveResponseFile(
				await guestDownload(token, id, signal),
				name,
				signal,
			);
		} catch (reason) {
			if (controller.signal.aborted) return;
			setError(
				accessDenied(reason)
					? "Документ недоступен."
					: "Не удалось скачать документ. Попробуйте ещё раз.",
			);
			if (accessDenied(reason)) refresh();
		} finally {
			request.current = null;
			if (!controller.signal.aborted) setPending("");
		}
	}
	return (
		<section className={styles.panel}>
			<h2>Документы</h2>
			{error && <Feedback tone="warning">{error}</Feedback>}
			{shipment.documents.length ? (
				<div className={styles.scroll}>
					<table className={styles.table}>
						<thead>
							<tr>
								<th>Название</th>
								<th>Категория</th>
								<th>Загружен</th>
								<th>Версия</th>
								<th>Действие</th>
							</tr>
						</thead>
						<tbody>
							{shipment.documents.map((document) => (
								<tr key={document.id}>
									<th scope="row">{document.name}</th>
									<td>{categories[document.category]}</td>
									<td>
										{formatMoment(
											document.uploaded_at,
											shipment.order.time_zone,
										)}
									</td>
									<td>{document.version}</td>
									<td>
										<Button
											variant="default"
											size="sm"
											disabled={!!pending}
											aria-label={`Скачать ${document.name}`}
											onClick={() => void download(document.id, document.name)}
										>
											{pending === document.id ? "Скачиваем…" : "Скачать"}
										</Button>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			) : (
				<p>Опубликованных документов пока нет.</p>
			)}
		</section>
	);
}
