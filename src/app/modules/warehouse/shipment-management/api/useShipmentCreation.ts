import { skipToken, useQuery, useQueryClient } from "@tanstack/react-query";

import { guestLinkReplayOutcome } from "@/domain/shipment";
import { ApiError } from "@/shared/http";
import { availableStorage, UserError } from "@/shared/lib";

import {
	readShipmentCreation,
	storeShipmentCreation,
	type ShipmentCreation,
} from "./shipmentCreationStorage";

const terminalCreationStatuses = new Set([400, 401, 403, 404, 413, 422]);

export function useShipmentCreation(
	queryKey: readonly string[],
	storageKey: string | null,
	refreshAfterRevocation: () => Promise<unknown>,
) {
	const client = useQueryClient();
	const { storage } = availableStorage("sessionStorage");
	const creationKey = [...queryKey, "creation-attempt"];
	const uploadKey = [...creationKey, "multipart"];
	const savedUpload = useQuery<FormData | null>({
		queryKey: uploadKey,
		queryFn: skipToken,
		initialData: null,
		gcTime: Infinity,
	});
	const creation = useQuery<ShipmentCreation | null>({
		queryKey: creationKey,
		queryFn: skipToken,
		initialData: () => readShipmentCreation(storage, storageKey),
		gcTime: Infinity,
	});
	function setCreation(attempt: ShipmentCreation | null) {
		storeShipmentCreation(storage, storageKey, attempt);
		client.setQueryData(creationKey, attempt);

		if (!attempt) client.setQueryData(uploadKey, null);
	}

	async function create<T>(
		kind: ShipmentCreation["kind"],
		write: (key: string) => Promise<T>,
		{
			expiresAt,
			retry,
		}: { expiresAt?: string; retry?: ShipmentCreation | undefined },
	) {
		const previous = client.getQueryData<ShipmentCreation | null>(creationKey);

		if (previous !== undefined && previous !== (retry ?? null)) {
			throw new UserError("Сначала завершите предыдущую операцию.");
		}

		const attempt: ShipmentCreation = {
			kind,
			key: retry?.key ?? crypto.randomUUID(),
			status: "sending",
			startedAt: retry?.startedAt ?? Date.now(),
			expiresAt,
		};

		setCreation(attempt);

		try {
			const result = await write(attempt.key);

			if (
				client.getQueryData<ShipmentCreation>(creationKey)?.key === attempt.key
			)
				setCreation(null);

			return result;
		} catch (error) {
			if (
				client.getQueryData<ShipmentCreation>(creationKey)?.key !== attempt.key
			)
				throw error;

			const outcome =
				kind === "link" ? guestLinkReplayOutcome(error) : undefined;
			const replayStatus = outcome?.status;

			if (replayStatus === "revoked") {
				setCreation(null);
				await refreshAfterRevocation();

				throw new UserError("Ссылка уже отозвана.");
			}

			if (replayStatus === "secret-expired" || replayStatus === "mismatch") {
				const message =
					replayStatus === "secret-expired"
						? "Ссылка создана, но её URL больше недоступен."
						: "Сервер не принял ключ повтора для этого выпуска.";

				setCreation({ ...attempt, ...outcome });

				throw new UserError(message);
			}

			const rejected =
				error instanceof ApiError &&
				(terminalCreationStatuses.has(error.status) ||
					error.code === "STALE_DOCUMENT_VERSION");

			setCreation(
				rejected && !retry ? null : { ...attempt, status: "unknown" },
			);
			throw error;
		}
	}

	return {
		attempt: creation.data,
		hasUploadFile: !!savedUpload.data,
		getAttempt: () => client.getQueryData<ShipmentCreation | null>(creationKey),
		getUpload: () => client.getQueryData<FormData | null>(uploadKey),
		rememberUpload: (body: FormData) => client.setQueryData(uploadKey, body),
		clear: () => setCreation(null),
		create,
	};
}

export type ShipmentCreationAccess = ReturnType<typeof useShipmentCreation>;
