import { IconPlus } from "@tabler/icons-react";
import { useState } from "react";

import { guestLinkStatuses } from "@/domain/shipment";
import type { Order, Warehouse } from "@/domain/warehouse";

import type { GuestLink } from "../../api/guestLink.dto";
import { filterGuestLinkRows } from "../../model/guestLinkRows";

import { Button } from "@/shared/ui/controls";
import { ListFilters } from "@/shared/ui/dataDisplay";
import { Select } from "@/shared/ui/forms";

import { GuestLinksTable } from "../GuestLinksTable/GuestLinksTable";

import { managementStyles as styles } from "@/shared/ui/management";

const statusOptions = [
	{ value: "all", label: "Все статусы" },
	...Object.entries(guestLinkStatuses).map(([value, label]) => ({
		value,
		label,
	})),
];

export function WarehouseGuestLinksList({
	warehouse,
	orderById,
	links,
	isSaving,
	isCreationBlocked,
	onCreate,
	onCopy,
	onEdit,
	onRevoke,
}: {
	warehouse: Warehouse;
	orderById: ReadonlyMap<string, Order>;
	links: GuestLink[] | undefined;
	isSaving: boolean;
	isCreationBlocked: boolean;
	onCreate: () => void;
	onCopy: (url: string) => void;
	onEdit: (link: GuestLink) => void;
	onRevoke: (link: GuestLink) => void;
}) {
	const [search, setSearch] = useState("");
	const [status, setStatus] = useState("all");

	if (!links) return null;

	const rows = filterGuestLinkRows(links, orderById, search, status);

	const canCreate = orderById.size > 0 && !isSaving && !isCreationBlocked;

	function handleReset() {
		setStatus("all");
	}

	return (
		<>
			<div className={styles.toolbar}>
				<ListFilters
					search={{
						"aria-label": "Поиск по гостевым ссылкам",
						value: search,
						onChange: setSearch,
					}}
					count={Number(status !== "all")}
					onReset={handleReset}
				>
					<Select
						aria-label="Статус ссылки"
						value={status}
						onValueChange={setStatus}
						options={statusOptions}
					/>
				</ListFilters>
				<Button disabled={!canCreate} onClick={onCreate}>
					<IconPlus size={16} aria-hidden="true" /> Создать гостевую ссылку
				</Button>
			</div>
			<GuestLinksTable
				warehouseId={warehouse.id}
				timezone={warehouse.timezone}
				rows={rows}
				isSaving={isSaving}
				onCopy={onCopy}
				onEdit={onEdit}
				onRevoke={onRevoke}
			/>
		</>
	);
}
