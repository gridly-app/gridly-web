import { useEffect, useRef, useState } from "react";

import { ApiError } from "@/shared/http";
import { errorMessage } from "@/shared/lib";

const actionTimeoutMs = 60_000;

export type RunShipmentAction = (
	action: (signal: AbortSignal) => Promise<void>,
	options?: { refreshAfterWrite?: boolean; showSuccess?: boolean },
) => Promise<void>;

export function useShipmentActions(reread: () => Promise<void>) {
	const [busy, setBusy] = useState(false);
	const [notice, setNotice] = useState("");
	const [writeError, setWriteError] = useState("");
	const [refreshError, setRefreshError] = useState("");
	const request = useRef<AbortController | null>(null);
	const canWrite = !busy && !refreshError;

	useEffect(() => () => request.current?.abort(), []);

	async function refresh(signal: AbortSignal) {
		setRefreshError("");

		try {
			await reread();
		} catch (error) {
			if (!signal.aborted) setRefreshError(errorMessage(error));
		}
	}

	const run: RunShipmentAction = async (
		action,
		{ refreshAfterWrite = false, showSuccess = true } = {},
	) => {
		if (request.current || !canWrite) return;

		const controller = new AbortController();
		const signal = AbortSignal.any([
			controller.signal,
			AbortSignal.timeout(actionTimeoutMs),
		]);

		request.current = controller;
		setBusy(true);
		setWriteError("");
		setNotice("");

		try {
			await action(signal);

			if (controller.signal.aborted) return;

			if (showSuccess) setNotice("Изменения сохранены.");

			if (refreshAfterWrite) await refresh(controller.signal);
		} catch (error) {
			if (controller.signal.aborted) return;

			setWriteError(shipmentActionError(error));
		} finally {
			request.current = null;

			if (!controller.signal.aborted) setBusy(false);
		}
	};

	async function handleRefresh() {
		if (request.current) return;

		const controller = new AbortController();

		request.current = controller;
		setBusy(true);

		try {
			await refresh(controller.signal);
		} finally {
			request.current = null;

			if (!controller.signal.aborted) setBusy(false);
		}
	}

	return {
		busy,
		canWrite,
		notice,
		writeError,
		refreshError,
		run,
		handleRefresh,
	};
}

function shipmentActionError(error: unknown) {
	const message = errorMessage(error);

	if (!(error instanceof ApiError)) return message;
	if (error.status === 412 && error.code === "STALE_REVISION") {
		return "Версия отгрузки изменилась. Ваши правки сохранены. Обновите данные для сравнения.";
	}
	if (error.status === 409 && error.code === "INVALID_STATE") {
		return `Запись запрещена в текущем состоянии отгрузки. ${message}`;
	}
	if (error.status === 422 && error.code === "UNSUPPORTED_ORDER_KIND") {
		return "Редактор отгрузки доступен только для исходящих заказов.";
	}

	return message;
}
