import { useMutation } from "@tanstack/react-query";

import type { WorkspaceMode } from "@/ports/session";
import { type HttpClient, saveFile } from "@/shared/http";

import type { AuditPage } from "../api/audit.dto";
import { verifyAuditSnapshot } from "../api/auditSnapshot";
import { auditCsv } from "./auditCsv";
import type { AuditRow } from "./auditPresentation";

export function useAuditExport(
	http: HttpClient,
	path: string,
	mode: WorkspaceMode,
	snapshot: readonly AuditPage[] | undefined,
	rows: AuditRow[],
) {
	const verification = useMutation({
		mutationFn: (pages: readonly AuditPage[]) =>
			verifyAuditSnapshot(http, path, pages),
	});
	const hasSnapshot = Boolean(snapshot?.length);
	const hasRows = rows.length > 0;
	const isAvailable = !verification.isPending && !verification.error;
	const canExport = hasSnapshot && hasRows && isAvailable;

	function handleExport() {
		if (!canExport || !snapshot) return;

		const filename =
			mode === "sandbox"
				? "sandbox-shipment-audit.csv"
				: "gridly-shipment-audit.csv";

		verification.mutate(snapshot, {
			onSuccess: () => {
				const file = new Blob(["\uFEFF", auditCsv(rows)], {
					type: "text/csv;charset=utf-8",
				});

				saveFile(file, filename);
			},
		});
	}

	return {
		canExport,
		handleExport,
		exportError: verification.error,
		resetExport: verification.reset,
	};
}
