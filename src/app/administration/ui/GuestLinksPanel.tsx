import { IconCopy, IconLink, IconPlus } from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type FormEvent, useId, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
	formatMoment,
	type GuestSection,
	guestSectionSchema,
	guestSections,
} from "@/domain/shipment";
import type { Warehouse } from "@/domain/warehouse";
import {
	useWarehouseResources,
	useWarehouseScopeId,
	useWarehouses,
} from "@/ports/warehouse";
import { type FetchHttpClient, parseResponse } from "@/shared/http";
import { errorMessage } from "@/shared/lib";
import { Button, Checkbox, IconButton, Input } from "@/shared/ui/controls";
import { Badge, ListFilters } from "@/shared/ui/dataDisplay";
import { Feedback, RetryButton } from "@/shared/ui/feedback";
import { Combobox, Field, SearchField, Select } from "@/shared/ui/forms";
import { Link } from "@/shared/ui/navigation";
import { Modal } from "@/shared/ui/overlays";
import styles from "../Administration.module.css";
import { adminSearch } from "../model/adminSearch";
import {
	createdGuestLinkSchema,
	type GuestLink,
	guestLinkInputSchema,
	guestLinksPath,
	guestLinksSchema,
} from "../model/guestLink.dto";
import { DeleteRowAction, EditRowAction, SortedAdminTable } from "./AdminTable";

const statuses = {
	active: "Действует",
	expired: "Истекла",
	revoked: "Отозвана",
};

function compactGuestUrl(value: string) {
	const url = new URL(value);
	const token = new URLSearchParams(url.hash.slice(1)).get("token");
	if (token) return `${url.host}/…${token.slice(-6)}`;
	const address = `${url.host}${url.pathname}`;
	return address.length > 24 ? `${address.slice(0, 21)}…` : address;
}

export function GuestLinksPanel({
	http,
	mode,
}: {
	http: FetchHttpClient;
	mode: "standard" | "sandbox";
}) {
	const warehouses = useWarehouses();
	const [params, setParams] = useSearchParams();
	const warehouseId = params.get("warehouse_id") ?? warehouses.data?.[0]?.id;
	const warehouse = warehouses.data?.find((row) => row.id === warehouseId);
	return (
		<section className={styles.panel} aria-label="Гостевые ссылки">
			{warehouses.isPending && <Feedback>Загружаем склады…</Feedback>}
			{warehouses.error && (
				<Feedback
					tone="error"
					action={<RetryButton onRetry={warehouses.refetch} />}
				>
					{errorMessage(warehouses.error)}
				</Feedback>
			)}
			{warehouses.isSuccess && (
				<Combobox
					className={styles.warehouseSelect}
					aria-label="Склад"
					value={warehouse?.id ?? ""}
					onValueChange={(value) =>
						setParams({ tab: "links", warehouse_id: value })
					}
					options={warehouses.data.map(({ id, name }) => ({
						value: id,
						label: name,
					}))}
				/>
			)}
			{warehouse && (
				<WarehouseLinks
					key={JSON.stringify([warehouse.id, params.get("order_id")])}
					path={guestLinksPath(mode, warehouse.id)}
					http={http}
					warehouse={warehouse}
					initialOrder={params.get("order_id")}
				/>
			)}
		</section>
	);
}

function WarehouseLinks({
	path,
	warehouse,
	http,
	initialOrder,
}: {
	path: string;
	warehouse: Warehouse;
	http: FetchHttpClient;
	initialOrder: string | null;
}) {
	const resources = useWarehouseResources(warehouse, ["orders"]);
	const queryClient = useQueryClient();
	const scopeId = useWarehouseScopeId();
	const queryKey = [scopeId, "shipment-admin", path];
	const query = useQuery({
		queryKey,
		queryFn: async ({ signal }) =>
			parseResponse(guestLinksSchema, await http.request(path, { signal })),
		retry: false,
	});
	const [editor, setEditor] = useState<GuestLink | "new" | null>(
		initialOrder ? "new" : null,
	);
	const [revoke, setRevoke] = useState<GuestLink | null>(null);
	const [issued, setIssued] = useState<{ id: string; url: string } | null>(
		null,
	);
	const [notice, setNotice] = useState("");
	const [search, setSearch] = useState("");
	const [status, setStatus] = useState("all");
	const mutation = useMutation({
		mutationFn: async (action: {
			link?: GuestLink;
			data?: ReturnType<typeof guestLinkInputSchema.parse>;
			key?: string;
		}) => {
			const target = action.link
				? `${path}/${encodeURIComponent(action.link.id)}`
				: path;
			if (!action.data && action.link) {
				await http.request(target, { method: "DELETE" });
				return null;
			}
			if (action.link) {
				await http.request(target, {
					method: "PATCH",
					body: { ...action.data, revision: action.link.revision },
				});
				return null;
			}
			return parseResponse(
				createdGuestLinkSchema,
				await http.request(target, {
					method: "POST",
					body: action.data,
					idempotencyKey: action.key,
					privacy: true,
				}),
			);
		},
		onSuccess: async (link, action) => {
			if (link) setIssued(link);
			else if (!action.data && action.link?.id === issued?.id) setIssued(null);
			setEditor(null);
			setRevoke(null);
			setNotice(action.data ? "Доступ сохранён." : "Ссылка отозвана.");
			await queryClient.invalidateQueries({ queryKey });
		},
	});
	const orders = resources.warehouse.orders.filter(
		(order) => order.kind === "outbound",
	);
	const orderById = new Map(orders.map((order) => [order.id, order]));
	const customerForLink = (link: GuestLink) => {
		const customers = new Set(
			link.order_ids
				.map((id) => orderById.get(id)?.party)
				.filter((party): party is string => !!party),
		);
		return [...customers].join(", ") || "Заказчик не указан";
	};
	const matches = adminSearch(search);
	const rows =
		query.data?.items.filter(
			(link) =>
				(status === "all" || link.status === status) &&
				matches([
					link.name,
					...link.order_ids.map((id) => {
						const order = orderById.get(id);
						return order ? `${order.party} ${order.number}` : id;
					}),
					...link.sections.map((section) => guestSections[section]),
				]),
		) ?? [];
	return (
		<>
			{query.isPending && <Feedback>Загружаем гостевые ссылки…</Feedback>}
			{query.error && (
				<Feedback tone="error" action={<RetryButton onRetry={query.refetch} />}>
					{errorMessage(query.error)}
				</Feedback>
			)}
			{resources.error && (
				<Feedback
					tone="error"
					action={<RetryButton onRetry={() => void resources.retry()} />}
				>
					{errorMessage(resources.error)}
				</Feedback>
			)}
			{query.isSuccess && (
				<>
					<div className={styles.toolbar}>
						<ListFilters
							search={{
								"aria-label": "Поиск по гостевым ссылкам",
								value: search,
								onChange: setSearch,
							}}
							count={Number(status !== "all")}
							onReset={() => setStatus("all")}
						>
							<Select
								aria-label="Статус ссылки"
								value={status}
								onValueChange={setStatus}
								options={[
									{ value: "all", label: "Все статусы" },
									...Object.entries(statuses).map(([value, label]) => ({
										value,
										label,
									})),
								]}
							/>
						</ListFilters>
						<Button
							disabled={!orders.length || mutation.isPending}
							onClick={() => {
								mutation.reset();
								setNotice("");
								setEditor("new");
							}}
						>
							<IconPlus size={16} aria-hidden="true" /> Создать гостевую ссылку
						</Button>
					</div>
					{notice && <Feedback tone="success">{notice}</Feedback>}
					{issued &&
						query.data.items.some(
							(link) => link.id === issued.id && link.status === "active",
						) && (
							<div className={styles.form}>
								<Field label="Гостевая ссылка">
									<Input
										readOnly
										value={issued.url}
										onFocus={(event) => event.target.select()}
									/>
								</Field>
								<div className={styles.actions}>
									<Button
										variant="secondary"
										onClick={async () => {
											try {
												await navigator.clipboard.writeText(issued.url);
												setNotice("Ссылка скопирована.");
											} catch {
												setNotice(
													"Выделите ссылку в поле и скопируйте её вручную.",
												);
											}
										}}
									>
										Копировать ссылку
									</Button>
								</div>
							</div>
						)}
					<SortedAdminTable<GuestLink>
						label="Ссылки склада"
						rows={rows}
						rowKey={(link) => link.id}
						columns={[
							{
								label: "Заказчик",
								value: customerForLink,
								cell: (link) => (
									<span
										className={styles.guestLinkName}
										title={customerForLink(link)}
									>
										{customerForLink(link)}
									</span>
								),
							},
							{
								label: "Заказ",
								value: (link) =>
									link.order_ids
										.map((id) => orderById.get(id)?.number ?? id)
										.join(", "),
								cell: (link) => (
									<div className={styles.orderMarkers}>
										{link.order_ids.map((id) => {
											const order = orderById.get(id);
											const label = order?.number ?? id;
											return (
												<Badge
													key={id}
													tone="neutral"
													className={styles.orderMarker}
													title={label}
												>
													{order ? (
														<Link
															to={`?${new URLSearchParams({ tab: "links", warehouse_id: warehouse.id, order: order.id })}`}
														>
															{order.number}
														</Link>
													) : (
														id
													)}
												</Badge>
											);
										})}
									</div>
								),
							},
							{
								label: "Гостевая ссылка",
								value: (link) => link.url ?? "",
								cell: (link) =>
									link.url && (
										<div className={styles.guestLinkUrl}>
											<span
												className={styles.guestLinkUrlText}
												title={link.url}
											>
												{compactGuestUrl(link.url)}
											</span>
											<IconButton
												label={`Скопировать ссылку: ${customerForLink(link)}`}
												icon={<IconCopy aria-hidden="true" />}
												tooltip="Копировать ссылку"
												onClick={async () => {
													try {
														await navigator.clipboard.writeText(link.url ?? "");
														setNotice("Ссылка скопирована.");
													} catch {
														setNotice(
															"Не удалось скопировать ссылку. Выделите её и скопируйте вручную.",
														);
													}
												}}
											/>
										</div>
									),
							},
							{
								label: "Статус",
								value: (link) => statuses[link.status],
								cell: (link) => (
									<Badge
										tone={link.status === "active" ? "success" : "neutral"}
									>
										{statuses[link.status]}
									</Badge>
								),
							},
							{
								label: "Период действия",
								value: (link) => Date.parse(link.created_at ?? ""),
								cell: (link) => (
									<div className={styles.guestLinkPeriod}>
										<span>
											По {formatMoment(link.expires_at, warehouse.timezone)}
										</span>
									</div>
								),
							},
							{
								label: "Действия",
								cell: (link) =>
									link.status === "active" && (
										<div className={styles.actions}>
											<EditRowAction
												label="Изменить гостевую ссылку"
												disabled={mutation.isPending}
												onClick={() => {
													mutation.reset();
													setNotice("");
													setEditor({
														...link,
														name: customerForLink(link).slice(0, 120),
													});
												}}
											/>
											<DeleteRowAction
												label="Удалить гостевую ссылку"
												disabled={mutation.isPending}
												onClick={() => {
													mutation.reset();
													setNotice("");
													setRevoke(link);
												}}
											/>
										</div>
									),
							},
						]}
					/>
				</>
			)}
			{query.isSuccess && resources.hasData && editor && (
				<GuestLinkForm
					key={editor === "new" ? "new" : editor.id}
					link={editor === "new" ? undefined : editor}
					initialOrder={initialOrder}
					orders={orders}
					busy={mutation.isPending}
					error={mutation.error}
					onClose={() => {
						if (!mutation.isPending) setEditor(null);
					}}
					onSave={(data, key) =>
						mutation.mutate({
							data,
							key,
							...(editor !== "new" && { link: editor }),
						})
					}
				/>
			)}
			{revoke && (
				<Modal
					title="Удалить гостевую ссылку?"
					onClose={() => {
						if (!mutation.isPending) setRevoke(null);
					}}
				>
					<div className={styles.form}>
						<p>
							Получатели ссылки «{customerForLink(revoke)}» потеряют доступ к
							заказам.
						</p>
						{mutation.error && (
							<Feedback tone="error">{errorMessage(mutation.error)}</Feedback>
						)}
						<div>
							<Button
								variant="destructive"
								disabled={mutation.isPending}
								onClick={() => mutation.mutate({ link: revoke })}
							>
								Удалить ссылку
							</Button>
						</div>
					</div>
				</Modal>
			)}
		</>
	);
}

function GuestLinkForm({
	link,
	initialOrder,
	orders,
	onClose,
	onSave,
	busy,
	error,
}: {
	link: GuestLink | undefined;
	initialOrder: string | null;
	orders: { id: string; number: string; party: string }[];
	onClose: () => void;
	onSave: (
		data: ReturnType<typeof guestLinkInputSchema.parse>,
		key: string,
	) => void;
	busy: boolean;
	error: unknown;
}) {
	const [filter, setFilter] = useState("");
	const [orderIds, setOrderIds] = useState<string[]>(
		link?.order_ids ?? (initialOrder ? [initialOrder] : []),
	);
	const [sections, setSections] = useState<GuestSection[]>(
		link?.sections ?? [],
	);
	const [previewOrder, setPreviewOrder] = useState("");
	const fieldId = useId();
	const unavailable = orderIds
		.filter((id) => !orders.some((order) => order.id === id))
		.map((id) => ({ id, number: id, party: "Заказ недоступен" }));
	const options = [...orders, ...unavailable];
	const selectedOrders = options.filter(({ id }) => orderIds.includes(id));
	const matches = adminSearch(filter);
	const visibleOrders = options.filter(({ number, party }) =>
		matches([number, party]),
	);
	const preview =
		selectedOrders.find(({ id }) => id === previewOrder) ?? selectedOrders[0];
	const [validation, setValidation] = useState("");
	const attempt = useRef<{ body: string; key: string } | null>(null);
	const validationRef = useRef<HTMLParagraphElement>(null);
	const expires = new Date(link?.expires_at ?? Date.now() + 7 * 86400000)
		.toISOString()
		.slice(0, 16);
	function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const data = new FormData(event.currentTarget);
		const expiresAt = new Date(`${data.get("expires")}Z`);
		const result = guestLinkInputSchema.safeParse({
			name: data.get("name"),
			expires_at: Number.isFinite(expiresAt.getTime())
				? expiresAt.toISOString()
				: "",
			order_ids: orderIds,
			sections,
		});
		if (
			unavailable.length ||
			!result.success ||
			expiresAt.getTime() <= Date.now()
		) {
			setValidation(
				unavailable.length
					? "Снимите выбор с недоступных заказов, чтобы сохранить ссылку."
					: "Укажите название, будущий срок действия и хотя бы один заказ.",
			);
			requestAnimationFrame(() => validationRef.current?.focus());
			return;
		}
		setValidation("");
		const body = JSON.stringify(result.data);
		if (attempt.current?.body !== body)
			attempt.current = { body, key: crypto.randomUUID() };
		onSave(result.data, attempt.current.key);
	}

	return (
		<Modal
			wide
			title={link ? "Изменить гостевую ссылку" : "Новая гостевая ссылка"}
			onClose={onClose}
		>
			<form className={styles.form} method="post" onSubmit={submit}>
				<div className={styles.editorColumns}>
					<Field label="Название">
						<Input
							name="name"
							required
							maxLength={120}
							defaultValue={link?.name}
						/>
					</Field>
					<Field label="Действует до (UTC)">
						<Input
							name="expires"
							type="datetime-local"
							required
							defaultValue={expires}
						/>
					</Field>
				</div>
				<div className={styles.editorColumns}>
					<div className={styles.form}>
						<fieldset>
							<legend>Заказы на отгрузку · {selectedOrders.length}</legend>
							<SearchField
								aria-label="Найти заказ"
								value={filter}
								onChange={setFilter}
							/>
							<div className={styles.checkList}>
								{visibleOrders.map((order) => {
									const id = `${fieldId}-order-${order.id}`;
									return (
										<label
											key={order.id}
											className={styles.checkRow}
											htmlFor={id}
										>
											<Checkbox
												id={id}
												checked={orderIds.includes(order.id)}
												onCheckedChange={(checked) =>
													setOrderIds((current) =>
														checked
															? [...current, order.id]
															: current.filter((value) => value !== order.id),
													)
												}
											/>
											{order.number} · {order.party}
										</label>
									);
								})}
								{!visibleOrders.length && (
									<p className={styles.subtle}>Заказы не найдены</p>
								)}
							</div>
						</fieldset>
						<fieldset>
							<legend>Доступные разделы</legend>
							{guestSectionSchema.options.map((section) => {
								const id = `${fieldId}-section-${section}`;
								return (
									<label key={section} className={styles.checkRow} htmlFor={id}>
										<Checkbox
											id={id}
											checked={sections.includes(section)}
											onCheckedChange={(checked) =>
												setSections((current) =>
													checked
														? [...current, section]
														: current.filter((value) => value !== section),
												)
											}
										/>
										{guestSections[section]}
									</label>
								);
							})}
						</fieldset>
					</div>
					<section className={styles.preview} aria-label="Предпросмотр доступа">
						<h3 className={styles.actions}>
							<IconLink size={16} aria-hidden="true" /> Что увидит гость
						</h3>
						{selectedOrders.length > 1 && (
							<Combobox
								aria-label="Заказ для предпросмотра"
								value={preview?.id}
								onValueChange={setPreviewOrder}
								options={selectedOrders.map(({ id, number }) => ({
									value: id,
									label: number,
								}))}
							/>
						)}
						{preview ? (
							<>
								<strong>Заказ {preview.number}</strong>
								<span className={styles.subtle}>{preview.party}</span>
								<ul>
									<li>Сведения о заказе и статус</li>
									{guestSectionSchema.options
										.filter((section) => sections.includes(section))
										.map((section) => (
											<li key={section}>{guestSections[section]}</li>
										))}
								</ul>
							</>
						) : (
							<p className={styles.subtle}>
								Выберите заказ, чтобы увидеть доступные разделы.
							</p>
						)}
					</section>
				</div>
				<p ref={validationRef} role="alert" tabIndex={-1} hidden={!validation}>
					{validation}
				</p>
				{error != null && (
					<Feedback tone="error">{errorMessage(error)}</Feedback>
				)}
				<div className={styles.actions}>
					<Button variant="secondary" onClick={onClose} disabled={busy}>
						Отмена
					</Button>
					<Button type="submit" disabled={busy}>
						{link ? "Сохранить доступ" : "Выпустить ссылку"}
					</Button>
				</div>
			</form>
		</Modal>
	);
}
