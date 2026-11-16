import {
	IconActivity,
	IconArrowLeft,
	IconBuildingWarehouse,
	IconClipboardList,
	IconHistory,
	IconLink,
	IconShieldCog,
	IconUsers,
} from "@tabler/icons-react";
import { type ReactNode, Suspense } from "react";
import { useSearchParams } from "react-router-dom";
import type { Warehouse } from "@/domain/warehouse";
import { useWarehouses } from "@/ports/warehouse";
import type { FetchHttpClient } from "@/shared/http";
import { Feedback } from "@/shared/ui/feedback";
import { Link } from "@/shared/ui/navigation";
import { Modal } from "@/shared/ui/overlays";
import styles from "./Administration.module.css";
import { auditPath, systemPath, usersPath } from "./model/shipmentAudit";
import { AuditPanel } from "./ui/AuditPanel";
import { GuestLinksPanel } from "./ui/GuestLinksPanel";
import { OrdersPanel } from "./ui/OrdersPanel";
import { SystemPanel } from "./ui/SystemPanel";
import { UsersPanel } from "./ui/UsersPanel";
import { WarehousesPanel } from "./ui/WarehousesPanel";

const groups = [
	{
		label: "Операции",
		items: [
			{ id: "warehouses", label: "Склады", icon: IconBuildingWarehouse },
			{ id: "orders", label: "Заказы", icon: IconClipboardList },
		],
	},
	{
		label: "Доступ",
		items: [
			{ id: "users", label: "Пользователи", icon: IconUsers },
			{ id: "links", label: "Гостевые ссылки", icon: IconLink },
		],
	},
	{
		label: "Мониторинг",
		items: [
			{ id: "audit", label: "Журнал аудита", icon: IconHistory },
			{ id: "system", label: "Состояние системы", icon: IconActivity },
		],
	},
] as const;

const sections = groups.flatMap((group) => [...group.items]);

export function Administration({
	http,
	mode,
	renderSettings,
	renderOrder,
}: {
	http: FetchHttpClient;
	mode: "standard" | "sandbox";
	renderSettings: (warehouse: Warehouse) => ReactNode;
	renderOrder: (warehouse: Warehouse) => ReactNode;
}) {
	const [params] = useSearchParams();
	const warehouseId = params.get("warehouse_id") ?? "";
	const orderId = params.get("order_id") ?? "";
	const sectionId =
		params.get("tab") ?? (warehouseId && orderId ? "system" : "audit");
	const section =
		sections.find(({ id }) => id === sectionId) ?? groups[2].items[0];
	const isSandbox = mode === "sandbox";
	const prefix = isSandbox ? "/sandbox" : "";

	return (
		<div className={styles.page}>
			<aside className={styles.sidebar}>
				<Link className={styles.back} to={isSandbox ? "/sandbox" : "/app"}>
					<IconArrowLeft size={16} aria-hidden="true" /> Рабочее пространство
				</Link>
				<div className={styles.adminTitle}>
					<span className={styles.sectionIcon}>
						<IconShieldCog size={20} aria-hidden="true" />
					</span>
					Администрирование
				</div>
				<nav
					className={styles.navigation}
					aria-label="Разделы администрирования"
				>
					{groups.map((group) => (
						<div key={group.label}>
							<p>{group.label}</p>
							{group.items.map(({ id, label, icon: Icon }) => (
								<Link
									key={id}
									className={styles.navLink}
									aria-current={section.id === id ? "page" : undefined}
									to={id === "audit" ? "?" : `?tab=${id}`}
								>
									<Icon size={18} aria-hidden="true" />
									{label}
								</Link>
							))}
						</div>
					))}
				</nav>
			</aside>
			<main className={styles.main}>
				<header className={styles.heading}>
					<h1>{section.label}</h1>
				</header>
				{section.id === "warehouses" && (
					<WarehousesPanel renderSettings={renderSettings} />
				)}
				{section.id === "orders" && <OrdersPanel />}
				{section.id === "links" && <GuestLinksPanel http={http} mode={mode} />}
				{section.id === "users" && (
					<UsersPanel
						key={params.get("user")}
						http={http}
						path={prefix + usersPath}
						userId={params.get("user")}
					/>
				)}
				{section.id === "system" && (
					<SystemPanel
						key={JSON.stringify([warehouseId, orderId])}
						http={http}
						path={prefix + systemPath}
						warehouseId={warehouseId}
						orderId={orderId}
					/>
				)}
				{section.id === "audit" && (
					<AuditPanel http={http} path={prefix + auditPath} />
				)}
				{params.has("order") && (
					<AdminOrderDialog
						key={warehouseId}
						warehouseId={warehouseId}
						renderOrder={renderOrder}
					/>
				)}
			</main>
		</div>
	);
}

function AdminOrderDialog({
	warehouseId,
	renderOrder,
}: {
	warehouseId: string;
	renderOrder: (warehouse: Warehouse) => ReactNode;
}) {
	const warehouses = useWarehouses();
	const [, setParams] = useSearchParams();
	const warehouse = warehouses.data?.find(({ id }) => id === warehouseId);
	if (warehouse)
		return (
			<Suspense
				fallback={
					<Feedback tone="loading">Загружаем карточку заказа…</Feedback>
				}
			>
				{renderOrder(warehouse)}
			</Suspense>
		);

	return (
		<Modal
			title="Карточка заказа"
			onClose={() =>
				setParams(
					(current) => {
						const next = new URLSearchParams(current);
						next.delete("order");
						return next;
					},
					{ replace: true },
				)
			}
		>
			{warehouses.isPending ? (
				<Feedback tone="loading">Загружаем склады…</Feedback>
			) : (
				<Feedback tone="error">Склад недоступен.</Feedback>
			)}
		</Modal>
	);
}
