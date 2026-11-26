import { warehousePath, adminLocation } from "@/ports/navigation";
import { useWorkspaceMode } from "@/ports/session";

import { guestLinkStatuses } from "@/domain/shipment";
import { userKinds } from "../../config/accessLabels";
import { formatMoment } from "@/shared/lib";
import {
	type AuditUser,
	type EditableAccount,
	isEditableAccount,
	userRowKey,
} from "../../api/users.dto";

import { Badge } from "@/shared/ui/dataDisplay";
import { Link } from "@/shared/ui/navigation";

import {
	DeleteRowAction,
	EditRowAction,
	type TableColumns,
	SortedTable,
	managementStyles as styles,
} from "@/shared/ui/management";

import userTableStyles from "./UsersTable.module.css";

const compareWarehouseNames = new Intl.Collator("ru", {
	numeric: true,
	sensitivity: "base",
}).compare;

export function UsersTable({
	users,
	onEdit,
	onDelete,
}: {
	users: AuditUser[];
	onEdit: (user: EditableAccount) => void;
	onDelete: (user: EditableAccount, warehouseId?: string) => void;
}) {
	const columns: TableColumns<AuditUser> = [
		{
			id: "user",
			label: "Пользователь",
			value: (user) => user.name,
			cell: (user) => (
				<>
					<Link
						className={styles.link}
						to={adminLocation("users", { user: user.id, user_kind: user.kind })}
					>
						{user.name}
					</Link>
					{user.kind === "account" && (
						<small className={styles.subtle}>{user.login}</small>
					)}
				</>
			),
		},
		{ id: "kind", label: "Тип доступа", value: (user) => userKinds[user.kind] },
		{
			id: "warehouses",
			label: "Склады и разрешения",
			value: (user) => {
				if (user.kind !== "account") return user.warehouse_name;

				const warehouses = user.warehouses.map((entry) => entry.warehouse_name);

				warehouses.sort(compareWarehouseNames);

				return warehouses.join(", ");
			},
			cell: (user) => <WarehouseAccessCell user={user} />,
		},
		{
			id: "link",
			label: "Гостевая ссылка",
			value: (user) =>
				user.kind === "guest" ? guestLinkStatuses[user.status] : "",
			cell: (user) =>
				user.kind === "guest" ? (
					<>
						<Badge tone={user.status === "active" ? "success" : "neutral"}>
							{guestLinkStatuses[user.status]}
						</Badge>
						<small className={styles.subtle}>
							До {formatMoment(user.expires_at, user.time_zone)}
						</small>
					</>
				) : (
					"Нет ссылки"
				),
		},
		{
			id: "actions",
			label: "Действия",
			cell: (user) => {
				if (!isEditableAccount(user)) return null;

				const account = user;
				const identity = `${account.name} (${account.login})`;

				function handleEdit() {
					onEdit(account);
				}

				function handleDelete() {
					onDelete(account);
				}

				return (
					<div className={userTableStyles.actions}>
						{account.allowed_actions.some((permission) =>
							["edit-profile", "edit-memberships"].includes(permission),
						) && (
							<EditRowAction
								label={`Изменить доступ: ${identity}`}
								onClick={handleEdit}
							/>
						)}
						{account.allowed_actions.includes("revoke-warehouse-access") &&
							account.warehouses.map((entry) => (
								<DeleteRowAction
									key={entry.warehouse_id}
									label={`Отозвать доступ к складу «${entry.warehouse_name}»: ${account.name}`}
									onClick={() => onDelete(account, entry.warehouse_id)}
								/>
							))}
						{account.allowed_actions.includes("deactivate-account") && (
							<DeleteRowAction
								label={`Деактивировать аккаунт: ${identity}`}
								onClick={handleDelete}
							/>
						)}
					</div>
				);
			},
		},
	];

	return (
		<SortedTable
			label="Доступ пользователей"
			columns={columns}
			rows={users}
			rowKey={userRowKey}
		/>
	);
}

function WarehouseAccessCell({ user }: { user: AuditUser }) {
	const mode = useWorkspaceMode();

	return user.kind === "account" ? (
		<ul className={userTableStyles.accessList}>
			{user.warehouses.map((entry) => (
				<li key={entry.warehouse_id}>
					<Link
						className={styles.link}
						to={warehousePath(mode, entry.warehouse_id)}
					>
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
			<Link className={styles.link} to={warehousePath(mode, user.warehouse_id)}>
				{user.warehouse_name}
			</Link>
			<small className={styles.subtle}>
				Заказ{" "}
				<Link
					className={styles.link}
					to={adminLocation("system", {
						warehouse_id: user.warehouse_id,
						order_id: user.order_id,
					})}
				>
					{user.order_number}
				</Link>
			</small>
		</>
	);
}
