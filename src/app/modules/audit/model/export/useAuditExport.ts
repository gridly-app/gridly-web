import { useLayoutEffect, useRef, useState } from "react";

import type { WorkspaceMode } from "@/ports/session";
import { useWarehouseScopeId } from "@/ports/warehouse";
import { ApiError, type FileHttpClient, saveResponseFile } from "@/shared/http";

type ExportStatus =
	| { type: "idle" }
	| { type: "pending" }
	| { type: "failed"; error: Error; isForbidden: boolean };

const exportFileNames: Record<WorkspaceMode, string> = {
	standard: "gridly-shipment-audit.csv",
	sandbox: "sandbox-shipment-audit.csv",
};

export function useAuditExport(
	http: Pick<FileHttpClient, "requestFile">,
	{ path, mode }: { path: string; mode: WorkspaceMode },
	filters: string,
	enabled: boolean,
) {
	const scopeId = useWarehouseScopeId();
	const controller = useRef<AbortController | null>(null);
	const [status, setStatus] = useState<ExportStatus>({ type: "idle" });
	const isForbidden = status.type === "failed" && status.isForbidden;

	useLayoutEffect(() => {
		setStatus({ type: "idle" });

		return () => {
			controller.current?.abort();
			controller.current = null;
		};
	}, [http, path, mode, scopeId, filters, enabled]);

	async function handleExport() {
		if (!enabled || isForbidden || controller.current) return;

		const active = new AbortController();
		const signal = active.signal;
		const target = filters ? `${path}/export?${filters}` : `${path}/export`;

		controller.current = active;
		setStatus({ type: "pending" });

		try {
			const response = await http.requestFile(target, { signal });
			const mediaType = response.headers
				.get("Content-Type")
				?.split(";", 1)[0]
				?.trim()
				.toLowerCase();

			if (mediaType !== "text/csv") {
				throw new Error("Сервер вернул файл в неожиданном формате.");
			}

			await saveResponseFile(response, exportFileNames[mode], signal);

			if (controller.current === active) setStatus({ type: "idle" });
		} catch (error) {
			if (signal.aborted) return;

			const isDenied = error instanceof ApiError && error.status === 403;
			const message = isDenied
				? "У аккаунта нет доступа к экспорту журнала аудита."
				: "Не удалось скачать журнал аудита. Повторите экспорт.";

			setStatus({
				type: "failed",
				error: new Error(message, { cause: error }),
				isForbidden: isDenied,
			});
		} finally {
			if (controller.current === active) controller.current = null;
		}
	}

	return {
		canExport: enabled && status.type !== "pending" && !isForbidden,
		handleExport,
		exportError: status.type === "failed" ? status.error : null,
		isForbidden,
	};
}
