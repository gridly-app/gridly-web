import { IconCopy } from "@tabler/icons-react";

import type { Order, Warehouse } from "@/domain/warehouse";

import { guestLinkStatuses } from "@/domain/shipment";
import { formatMoment } from "@/shared/lib";
import { guestLinkCustomer } from "../../model/guestLinkCustomer";
import type { GuestLink } from "../../api/guestLink.dto";
import { adminLocation } from "@/ports/navigation";

import { IconButton } from "@/shared/ui/controls";
import { Badge } from "@/shared/ui/dataDisplay";
import { Link } from "@/shared/ui/navigation";

import {
	DeleteRowAction,
	EditRowAction,
	type TableColumns,
	SortedTable,
	managementStyles as styles,
} from "@/shared/ui/management";

import guestLinksTableStyles from "./GuestLinksTable.module.css";

const tokenSuffixLength = 6;
const compactAddressLength = 24;
const ellipsis = "…";

function compactGuestUrl(value: string) {
	const url = new URL(value);
	const token = new URLSearchParams(url.hash.slice(1)).get("token");
	if (token) return `${url.host}/…${token.slice(-tokenSuffixLength)}`;
	const address = `${url.host}${url.pathname}`;

	return address.length > compactAddressLength
		? `${address.slice(0, compactAddressLength - ellipsis.length)}${ellipsis}`
		: address;
}

export function GuestLinksTable({
	warehouse,
	orderById,
	links,
	isSaving,
	onCopy,
	onEdit,
	onRevoke,
}: {
	warehouse: Warehouse;
	orderById: ReadonlyMap<string, Order>;
	links: GuestLink[];
	isSaving: boolean;
	onCopy: (url: string) => void;
	onEdit: (link: GuestLink) => void;
	onRevoke: (link: GuestLink) => void;
}) {
	const rows = links.map((link) => ({
		link,
		customer: guestLinkCustomer(link, orderById),
		orders: [...new Set(link.order_ids)].map((id) => ({
			id,
			number: orderById.get(id)?.number,
		})),
	}));

	const columns: TableColumns<(typeof rows)[number]> = [
		{
			id: "customer",
			label: "Заказчик",
			value: ({ customer }) => customer,
			cell: ({ customer }) => (
				<span className={guestLinksTableStyles.guestLinkName} title={customer}>
					{customer}
				</span>
			),
		},
		{ id: "name", label: "Название ссылки", value: ({ link }) => link.name },
		{
			id: "order",
			label: "Заказ",
			value: ({ orders }) =>
				orders.map(({ id, number }) => number ?? id).join(", "),
			cell: ({ orders }) => (
				<LinkOrders orders={orders} warehouseId={warehouse.id} />
			),
		},
		{
			id: "link",
			label: "Гостевая ссылка",
			value: ({ link }) => link.url ?? "",
			cell: ({ link, customer }) => (
				<GuestUrlCell link={link} customer={customer} onCopy={onCopy} />
			),
		},
		{
			id: "status",
			label: "Статус",
			value: ({ link }) => guestLinkStatuses[link.status],
			cell: ({ link }) => (
				<Badge tone={link.status === "active" ? "success" : "neutral"}>
					{guestLinkStatuses[link.status]}
				</Badge>
			),
		},
		{
			id: "expires",
			label: "Период действия",
			value: ({ link }) => Date.parse(link.expires_at),
			cell: ({ link }) => (
				<div className={guestLinksTableStyles.guestLinkPeriod}>
					<span>По {formatMoment(link.expires_at, warehouse.timezone)}</span>
				</div>
			),
		},
		{
			id: "actions",
			label: "Действия",
			cell: ({ link }) => {
				if (link.status !== "active") return null;

				const label = link.name || link.id;

				function handleEdit() {
					onEdit(link);
				}

				function handleRevoke() {
					onRevoke(link);
				}

				return (
					<div className={styles.actions}>
						<EditRowAction
							label={`Изменить гостевую ссылку: ${label}`}
							disabled={isSaving}
							onClick={handleEdit}
						/>
						<DeleteRowAction
							label={`Удалить гостевую ссылку: ${label}`}
							disabled={isSaving}
							onClick={handleRevoke}
						/>
					</div>
				);
			},
		},
	];

	return (
		<SortedTable
			label="Ссылки склада"
			rows={rows}
			rowKey={({ link }) => link.id}
			columns={columns}
		/>
	);
}

function GuestUrlCell({
	link,
	customer,
	onCopy,
}: {
	link: GuestLink;
	customer: string;
	onCopy: (url: string) => void;
}) {
	const { url, status } = link;

	if (!url) return null;

	const address = compactGuestUrl(url);
	const canCopy = status === "active";

	function handleCopy() {
		if (url) onCopy(url);
	}

	return (
		<div className={guestLinksTableStyles.guestLinkUrl}>
			<span className={guestLinksTableStyles.guestLinkUrlText} title={url}>
				{address}
			</span>
			{canCopy && (
				<IconButton
					label={`Скопировать ссылку: ${link.name || customer}`}
					icon={<IconCopy aria-hidden="true" />}
					tooltip="Копировать ссылку"
					onClick={handleCopy}
				/>
			)}
		</div>
	);
}

function LinkOrders({
	orders,
	warehouseId,
}: {
	orders: { id: string; number: string | undefined }[];
	warehouseId: string;
}) {
	return (
		<div className={guestLinksTableStyles.orderMarkers}>
			{orders.map(({ id, number }) => {
				const label = number ?? id;
				const to = number
					? adminLocation("links", { warehouse_id: warehouseId, order: id })
					: undefined;

				return (
					<Badge
						key={id}
						tone="neutral"
						className={guestLinksTableStyles.orderMarker}
						title={label}
					>
						{to ? (
							<Link className={styles.link} to={to}>
								{label}
							</Link>
						) : (
							label
						)}
					</Badge>
				);
			})}
		</div>
	);
}
