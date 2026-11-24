import { useEffect, useRef, useState } from "react";
import { saveResponseFile } from "@/shared/http";
import {
	isGuestAccessDenied,
	type DownloadGuestDocument,
} from "../api/guestShipmentApi";

const downloadTimeoutMs = 60_000;

export function useGuestDocumentDownload(
	token: string,
	downloadFile: DownloadGuestDocument,
	refresh: () => void,
) {
	const [pendingDocumentId, setPendingDocumentId] = useState<string | null>(
		null,
	);
	const [error, setError] = useState("");
	const request = useRef<AbortController | null>(null);

	useEffect(() => () => request.current?.abort(), []);

	async function download(id: string, name: string) {
		if (request.current) return;

		const controller = new AbortController();
		const signal = AbortSignal.any([
			controller.signal,
			AbortSignal.timeout(downloadTimeoutMs),
		]);
		request.current = controller;

		setPendingDocumentId(id);
		setError("");

		try {
			const response = await downloadFile(token, id, signal);

			await saveResponseFile(response, name, signal);
		} catch (reason) {
			if (controller.signal.aborted) return;

			const isDenied = isGuestAccessDenied(reason);
			const message = isDenied
				? "Документ недоступен."
				: "Не удалось скачать документ. Попробуйте ещё раз.";
			setError(message);

			if (isDenied) refresh();
		} finally {
			request.current = null;

			if (!controller.signal.aborted) setPendingDocumentId(null);
		}
	}

	return { pendingDocumentId, error, download };
}
