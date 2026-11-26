import { guestLinkStatuses } from "@/domain/shipment";
import type { Warehouse } from "@/domain/warehouse";
import { formatMoment } from "@/shared/lib";

import type { GuestLink } from "../../../api/guestLink.dto";
import type { GuestLinkRow } from "../../../model/list/guestLinkRows";
import { GuestLinkOrderCells } from "../GuestLinkOrderCells/GuestLinkOrderCells";
import { GuestLinkRowActions } from "../GuestLinkRowActions/GuestLinkRowActions";
import { GuestLinkUrlCell } from "../GuestLinkUrlCell/GuestLinkUrlCell";

import { Badge } from "@/shared/ui/dataDisplay";
import { type TableColumns, SortedTable } from "@/shared/ui/management";
import tableStyles from "./GuestLinksTable.module.css";

export function GuestLinksTable({
	warehouseId,
	timezone,
	rows,
	isSaving,
	onCopy,
	onEdit,
	onRevoke,
}: {
	warehouseId: Warehouse["id"];
	timezone: Warehouse["timezone"];
	rows: GuestLinkRow[];
	isSaving: boolean;
	onCopy: (url: string) => void;
	onEdit: (link: GuestLink) => void;
	onRevoke: (link: GuestLink) => void;
}) {
	const rowActions = { isSaving, onEdit, onRevoke };
	const columns: TableColumns<GuestLinkRow> = [
		{
			id: "customer",
			label: "Заказчик",
			value: ({ customer }) => customer,
			cell: ({ customer }) => (
				<span className={tableStyles.guestLinkName} title={customer}>
					{customer}
				</span>
			),
		},
		{ id: "name", label: "Название ссылки", value: ({ link }) => link.name },
		{
			id: "order",
			label: "Заказ",
			value: ({ orders }) => orders.map(({ label }) => label).join(", "),
			cell: ({ orders }) => (
				<GuestLinkOrderCells orders={orders} warehouseId={warehouseId} />
			),
		},
		{
			id: "link",
			label: "Гостевая ссылка",
			value: ({ link }) => link.url ?? "",
			cell: ({ link, customer }) => (
				<GuestLinkUrlCell link={link} customer={customer} onCopy={onCopy} />
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
				<div className={tableStyles.guestLinkPeriod}>
					<span>По {formatMoment(link.expires_at, timezone)}</span>
				</div>
			),
		},
		{
			id: "actions",
			label: "Действия",
			cell: ({ link }) => <GuestLinkRowActions link={link} {...rowActions} />,
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
