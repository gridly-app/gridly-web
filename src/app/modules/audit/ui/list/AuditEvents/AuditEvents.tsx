import { useMemo, useState } from "react";

import type { AuditEvent } from "@/domain/shipment";
import { useWorkspaceMode } from "@/ports/session";

import { SortedTable } from "@/shared/ui/management";

import { defaultAuditFilters, filterAuditRows } from "../../../model/filters/auditFilters";
import { auditRow } from "../../../model/auditPresentation";
import { AuditEventDialog } from "../../details/AuditEventDialog/AuditEventDialog";
import { auditColumns } from "../../../config/auditColumns";

export function AuditEvents({
	items,
	search,
	label = "События заказа",
}: {
	items: AuditEvent[];
	search: string;
	label?: string;
}) {
	const mode = useWorkspaceMode();
	const [selectedId, setSelectedId] = useState<string | null>(null);
	const selectedEvent = items.find(({ id }) => id === selectedId);
	const allRows = useMemo(() => items.map(auditRow), [items]);
	const rows = search
		? filterAuditRows(allRows, { ...defaultAuditFilters, search })
		: allRows;

	return (
		<>
			<SortedTable
				label={label}
				columns={auditColumns(mode, setSelectedId)}
				rows={rows}
				rowKey={({ event }) => event.id}
				descending
			/>
			{selectedEvent && (
				<AuditEventDialog
					event={selectedEvent}
					onClose={() => setSelectedId(null)}
				/>
			)}
		</>
	);
}
