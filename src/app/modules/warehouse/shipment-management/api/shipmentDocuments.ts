import { ApiError, type FileHttpClient, saveResponseFile } from "@/shared/http";
import { UserError } from "@/shared/lib";

import type { WorkingShipment } from "./shipment.dto";
import {
	documentVersionLimit,
	validateShipmentDocument,
} from "../model/shipmentDocument";
import type { ShipmentCreation } from "./shipmentCreationStorage";
import type { ShipmentCreationAccess } from "./useShipmentCreation";

const documentErrors = new Map([
	["FILE_TOO_LARGE", "Размер файла превышает 20 МиБ."],
	[
		"UNSUPPORTED_FILE_TYPE",
		"Сервер не поддерживает содержимое выбранного файла.",
	],
	[
		"DOCUMENT_LIMIT_EXCEEDED",
		`Достигнут предел в ${documentVersionLimit} версий документов на заказ.`,
	],
	[
		"STALE_DOCUMENT_VERSION",
		"У документа появилась новая версия. Обновите документы и выберите её.",
	],
]);

export function shipmentDocuments({
	http,
	path,
	creation,
	getDocumentCount,
	readShipment,
	replaceShipment,
}: {
	http: Pick<FileHttpClient, "request" | "requestFile">;
	path: string;
	creation: Pick<
		ShipmentCreationAccess,
		"getAttempt" | "getUpload" | "rememberUpload" | "clear" | "create"
	>;
	getDocumentCount: () => number | undefined;
	readShipment: (signal: AbortSignal) => Promise<WorkingShipment>;
	replaceShipment: (
		signal: AbortSignal,
		shipment: WorkingShipment,
	) => Promise<void>;
}) {
	async function uploadDocument(
		body: FormData,
		signal: AbortSignal,
		retry?: ShipmentCreation,
	) {
		validateShipmentDocument(body.get("file"));

		if (!retry && (getDocumentCount() ?? 0) >= documentVersionLimit) {
			throw new UserError("В заказе уже 100 версий документов.");
		}

		try {
			await creation.create(
				"document",
				(key) => {
					body.set("upload_request_id", key);
					body.set("published", "false");
					creation.rememberUpload(body);

					return http.request(`${path}/documents`, {
						method: "POST",
						body,
						signal,
					});
				},
				{ retry },
			);
		} catch (error) {
			if (!signal.aborted && creation.getAttempt()?.status === "unknown") {
				const confirmed = await reconcileUpload(signal).catch(() => false);

				if (confirmed) return;
			}

			const message =
				error instanceof ApiError && error.code
					? documentErrors.get(error.code)
					: undefined;

			if (message) throw new UserError(message);

			throw error;
		}
	}

	async function reconcileUpload(signal: AbortSignal) {
		const attempt = creation.getAttempt();

		if (attempt?.kind !== "document" || attempt.status !== "unknown")
			return false;

		const shipment = await readShipment(signal);

		await replaceShipment(signal, shipment);

		if (
			!shipment.documents.some(
				({ upload_request_id }) => upload_request_id === attempt.key,
			)
		)
			return false;

		creation.clear();

		return true;
	}

	async function retryUpload(signal: AbortSignal) {
		if (await reconcileUpload(signal)) return;

		const attempt = creation.getAttempt();
		const body = creation.getUpload();

		if (!body || attempt?.kind !== "document" || attempt.status !== "unknown") {
			throw new UserError(
				"Документ пока не найден. Исходный файл для повтора недоступен.",
			);
		}

		await uploadDocument(body, signal, attempt);
	}

	async function downloadDocument(
		id: string,
		name: string,
		signal: AbortSignal,
	) {
		const response = await http.requestFile(
			`${path}/documents/${encodeURIComponent(id)}/download`,
			{ signal },
		);

		await saveResponseFile(response, name, signal);
	}

	async function publishDocument(
		id: string,
		published: boolean,
		signal: AbortSignal,
	) {
		await http.request(`${path}/documents/${encodeURIComponent(id)}`, {
			method: "PATCH",
			body: { published },
			signal,
		});

		signal.throwIfAborted();
	}

	return { uploadDocument, retryUpload, downloadDocument, publishDocument };
}
