import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { warehousePath } from "@/ports/navigation";
import { useWorkspaceMode } from "@/ports/session";
import { useWarehouseScopeId } from "@/ports/warehouse";
import { type FetchHttpClient, parseResponse } from "@/shared/http";
import { errorMessage } from "@/shared/lib";
import { Button } from "@/shared/ui/controls";
import { Badge, ListFilters } from "@/shared/ui/dataDisplay";
import { Feedback, RetryButton } from "@/shared/ui/feedback";
import { Select } from "@/shared/ui/forms";
import { Link } from "@/shared/ui/navigation";
import { Modal } from "@/shared/ui/overlays";
import styles from "../Administration.module.css";
import { adminSearch } from "../model/adminSearch";
import { adminMoment } from "../model/auditPresentation";
import {
	type AccountUser,
	type AuditUser,
	usersSchema,
} from "../model/shipmentAudit";
import {
	type AdminColumn,
	DeleteRowAction,
	EditRowAction,
	SortedAdminTable,
} from "./AdminTable";
import { UserAccessEditor } from "./UserAccessEditor";

const kinds = { account: "Аккаунт", guest: "Гость по ссылке" };
const statuses = {
	active: "Действует",
	expired: "Истекла",
	revoked: "Отозвана",
};
const defaultPermissions = [
	{ code: "warehouse.view", label: "Просмотр склада", group: "Просмотр" },
	{
		code: "warehouse.manage",
		label: "Управление складом",
		group: "Управление",
	},
	{
		code: "shipment.manage",
		label: "Управление отгрузками",
		group: "Управление",
	},
	{ code: "shipment.audit", label: "Просмотр аудита", group: "Мониторинг" },
];

export function UsersPanel({
	http,
	path,
	userId,
}: {
	http: FetchHttpClient;
	path: string;
	userId: string | null;
}) {
	const [editing, setEditing] = useState<AccountUser | null>(null);
	const [deleting, setDeleting] = useState<AccountUser | null>(null);
	const [notice, setNotice] = useState("");
	const [search, setSearch] = useState("");
	const [kind, setKind] = useState("all");
	const [warehouse, setWarehouse] = useState("all");
	const [status, setStatus] = useState("all");
	const mode = useWorkspaceMode();
	const queryClient = useQueryClient();
	const scopeId = useWarehouseScopeId();
	const queryKey = [scopeId, "shipment-admin", path];
	const query = useQuery({
		queryKey,
		queryFn: async ({ signal }) =>
			parseResponse(usersSchema, await http.request(path, { signal })),
		retry: false,
	});
	const removeUser = useMutation({
		mutationFn: (user: AccountUser) =>
			http.request(`${path}/${encodeURIComponent(user.id)}`, {
				method: "DELETE",
				headers: { "If-Match": `"${user.revision}"` },
			}),
		onSuccess: async () => {
			await queryClient.invalidateQueries({ queryKey });
			setDeleting(null);
			setNotice("Пользователь удалён.");
		},
	});
	const permissions = query.data?.permission_catalog ?? defaultPermissions;
	const permissionLabel = (code: string) =>
		permissions.find((permission) => permission.code === code)?.label ?? code;
	const users = query.error ? [] : (query.data?.items ?? []);
	const locations = new Map(
		users.flatMap((user) =>
			user.kind === "account"
				? user.warehouses.map(
						(location) =>
							[location.warehouse_id, location.warehouse_name] as const,
					)
				: [[user.warehouse_id, user.warehouse_name] as const],
		),
	);
	const matches = adminSearch(search);
	const rows = users.filter((user) => {
		if (userId && user.id !== userId) return false;
		if (kind !== "all" && kind !== user.kind) return false;
		if (status !== "all" && (user.kind !== "guest" || user.status !== status))
			return false;
		const access = user.kind === "account" ? user.warehouses : [user];
		if (
			warehouse !== "all" &&
			!access.some((entry) => entry.warehouse_id === warehouse)
		)
			return false;
		return matches([
			user.name,
			kinds[user.kind],
			...access.map((entry) => entry.warehouse_name),
			...(user.kind === "account"
				? [
						user.login,
						...user.warehouses.flatMap((entry) =>
							entry.permissions.map(permissionLabel),
						),
					]
				: [
						user.order_number,
						statuses[user.status],
						adminMoment(user.expires_at, user.time_zone),
					]),
		]);
	});
	const columns: AdminColumn<AuditUser>[] = [
		{
			label: "Пользователь",
			value: (user) => user.name,
			cell: (user) => (
				<>
					<Link to={`?${new URLSearchParams({ tab: "users", user: user.id })}`}>
						{user.name}
					</Link>
					{user.kind === "account" && (
						<small className={styles.subtle}>{user.login}</small>
					)}
				</>
			),
		},
		{ label: "Тип доступа", value: (user) => kinds[user.kind] },
		{
			label: "Склады и разрешения",
			value: (user) =>
				user.kind === "account"
					? user.warehouses
							.map((entry) => entry.warehouse_name)
							.sort()
							.join(", ")
					: user.warehouse_name,
			cell: (user) =>
				user.kind === "account" ? (
					<ul className={styles.accessList}>
						{user.warehouses.map((entry) => (
							<li key={entry.warehouse_id}>
								<Link to={warehousePath(mode, entry.warehouse_id)}>
									{entry.warehouse_name}
								</Link>
								<small className={styles.subtle}>
									{entry.permissions.length
										? `Разрешений: ${entry.permissions.length}`
										: "Нет разрешений"}
								</small>
							</li>
						))}
						{!user.warehouses.length && <li>Нет доступа к складам</li>}
					</ul>
				) : (
					<>
						<Link to={warehousePath(mode, user.warehouse_id)}>
							{user.warehouse_name}
						</Link>
						<small className={styles.subtle}>
							Заказ{" "}
							<Link
								to={`?${new URLSearchParams({ tab: "system", warehouse_id: user.warehouse_id, order_id: user.order_id })}`}
							>
								{user.order_number}
							</Link>
						</small>
					</>
				),
		},
		{
			label: "Гостевая ссылка",
			value: (user) => (user.kind === "guest" ? statuses[user.status] : ""),
			cell: (user) =>
				user.kind === "guest" ? (
					<>
						<Badge tone={user.status === "active" ? "success" : "neutral"}>
							{statuses[user.status]}
						</Badge>
						<small className={styles.subtle}>
							До {adminMoment(user.expires_at, user.time_zone)}
						</small>
					</>
				) : (
					"Нет ссылки"
				),
		},
		{
			label: "Действия",
			cell: (user) =>
				user.kind === "account" && user.revision !== undefined ? (
					<div className={styles.actions}>
						<EditRowAction
							label="Изменить доступ"
							onClick={() => {
								setNotice("");
								setEditing(user);
							}}
						/>
						<DeleteRowAction
							label="Удалить пользователя"
							onClick={() => {
								removeUser.reset();
								setNotice("");
								setDeleting(user);
							}}
						/>
					</div>
				) : null,
		},
	];
	return (
		<section className={styles.panel} aria-label="Пользователи">
			<div className={styles.toolbar}>
				<ListFilters
					search={{
						"aria-label": "Поиск по пользователям",
						value: search,
						onChange: setSearch,
					}}
					count={
						Number(kind !== "all") +
						Number(warehouse !== "all") +
						Number(status !== "all")
					}
					onReset={() => {
						setKind("all");
						setWarehouse("all");
						setStatus("all");
					}}
				>
					<Select
						aria-label="Тип доступа"
						value={kind}
						onValueChange={setKind}
						options={[
							{ value: "all", label: "Все пользователи" },
							{ value: "account", label: "Аккаунты" },
							{ value: "guest", label: "Гости по ссылке" },
						]}
					/>
					<Select
						aria-label="Склад"
						value={warehouse}
						onValueChange={setWarehouse}
						options={[
							{ value: "all", label: "Все склады" },
							...[...locations].map(([value, label]) => ({ value, label })),
						]}
					/>
					<Select
						aria-label="Состояние гостевой ссылки"
						value={status}
						onValueChange={setStatus}
						options={[
							{ value: "all", label: "Любое состояние ссылки" },
							...Object.entries(statuses).map(([value, label]) => ({
								value,
								label,
							})),
						]}
					/>
				</ListFilters>
			</div>
			{userId && <Link to="?tab=users">Показать всех пользователей</Link>}
			{query.isPending && (
				<Feedback tone="loading">Загружаем пользователей…</Feedback>
			)}
			{query.error && (
				<Feedback tone="error" action={<RetryButton onRetry={query.refetch} />}>
					{errorMessage(query.error)}
				</Feedback>
			)}
			{notice && <Feedback tone="success">{notice}</Feedback>}
			{editing && (
				<UserAccessEditor
					http={http}
					path={path}
					user={editing}
					permissions={permissions}
					onClose={() => setEditing(null)}
					onSave={() => {
						setEditing(null);
						setNotice("Данные пользователя сохранены.");
					}}
				/>
			)}
			{deleting && (
				<Modal
					title="Удалить пользователя?"
					onClose={() => {
						if (!removeUser.isPending) setDeleting(null);
					}}
				>
					<div className={styles.form}>
						<p>Пользователь «{deleting.name}» потеряет доступ к складам.</p>
						{removeUser.error && (
							<Feedback tone="error">{errorMessage(removeUser.error)}</Feedback>
						)}
						<div className={styles.actions}>
							<Button
								variant="secondary"
								disabled={removeUser.isPending}
								onClick={() => setDeleting(null)}
							>
								Отмена
							</Button>
							<Button
								variant="destructive"
								disabled={removeUser.isPending}
								onClick={() => removeUser.mutate(deleting)}
							>
								Удалить пользователя
							</Button>
						</div>
					</div>
				</Modal>
			)}
			{query.data && !query.error && (
				<>
					<p className={styles.subtle} aria-live="polite">
						Найдено пользователей: {rows.length}
					</p>
					<SortedAdminTable
						label="Доступ пользователей"
						columns={columns}
						rows={rows}
						rowKey={(user) => user.id}
					/>
				</>
			)}
		</section>
	);
}
