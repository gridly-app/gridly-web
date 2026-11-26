import { useLayoutEffect, useRef, useState } from "react";

import { useWarehouseScopeId } from "@/ports/warehouse";
import {
	ApiError,
	type FetchHttpClient,
	saveResponseFile,
} from "@/shared/http";

type ExportStatus =
	| { type: "idle" }
	| { type: "pending" }
	| { type: "failed"; error: Error; forbidden: boolean };

export function useAuditExport(
	http: Pick<FetchHttpClient, "requestFile">,
	path: string,
	filters: string,
	enabled: boolean,
) {
	const scopeId = useWarehouseScopeId();
	const controller = useRef<AbortController | null>(null);
	const [status, setStatus] = useState<ExportStatus>({ type: "idle" });
	const isForbidden = status.type === "failed" && status.forbidden;

	useLayoutEffect(() => {
		setStatus({ type: "idle" });

		return () => {
			controller.current?.abort();
			controller.current = null;
		};
	}, [http, path, scopeId, filters, enabled]);

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

			const namespace = path.startsWith("/sandbox/") ? "sandbox" : "gridly";

			await saveResponseFile(
				response,
				`${namespace}-shipment-audit.csv`,
				signal,
			);
			if (controller.current === active) setStatus({ type: "idle" });
		} catch (error) {
			if (signal.aborted) return;

			const forbidden = error instanceof ApiError && error.status === 403;
			const message = forbidden
				? "У аккаунта нет доступа к экспорту журнала аудита."
				: "Не удалось скачать журнал аудита. Повторите экспорт.";

			setStatus({
				type: "failed",
				error: new Error(message, { cause: error }),
				forbidden,
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
