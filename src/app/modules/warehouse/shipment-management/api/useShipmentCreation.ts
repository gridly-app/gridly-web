import { skipToken, useQuery, useQueryClient } from "@tanstack/react-query";

import { guestLinkReplayOutcome, isRefusedCreation } from "@/domain/shipment";
import { availableStorage, UserError } from "@/shared/lib";

import {
	readShipmentCreation,
	type ShipmentCreation,
	storeShipmentCreation,
} from "./shipmentCreationStorage";

const replayErrors = {
	"secret-expired": "Ссылка создана, но её URL больше недоступен.",
	mismatch: "Сервер не принял ключ повтора для этого выпуска.",
} as const;

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

	function getAttempt() {
		return client.getQueryData<ShipmentCreation | null>(creationKey);
	}

	function setCreation(attempt: ShipmentCreation | null) {
		storeShipmentCreation(storage, storageKey, attempt);
		client.setQueryData(creationKey, attempt);

		if (!attempt) client.setQueryData(uploadKey, null);
	}

	async function settleFailedAttempt(
		attempt: ShipmentCreation,
		error: unknown,
		isRetry: boolean,
	) {
		const outcome =
			attempt.kind === "link" ? guestLinkReplayOutcome(error) : undefined;

		if (outcome?.status === "revoked") {
			setCreation(null);
			await refreshAfterRevocation();

			throw new UserError("Ссылка уже отозвана.");
		}

		if (
			outcome?.status === "secret-expired" ||
			outcome?.status === "mismatch"
		) {
			setCreation({ ...attempt, ...outcome });

			throw new UserError(replayErrors[outcome.status]);
		}

		const isRefused = isRefusedCreation(error);

		setCreation(
			isRefused && !isRetry ? null : { ...attempt, status: "unknown" },
		);
	}

	async function create<T>(
		kind: ShipmentCreation["kind"],
		write: (key: string) => Promise<T>,
		{
			expiresAt,
			retry,
		}: { expiresAt?: string; retry?: ShipmentCreation | undefined },
	) {
		const previous = getAttempt();

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

			if (getAttempt()?.key === attempt.key) setCreation(null);

			return result;
		} catch (error) {
			if (getAttempt()?.key === attempt.key)
				await settleFailedAttempt(attempt, error, Boolean(retry));

			throw error;
		}
	}

	return {
		attempt: creation.data,
		hasUploadFile: Boolean(savedUpload.data),
		getAttempt,
		getUpload: () => client.getQueryData<FormData | null>(uploadKey),
		rememberUpload: (body: FormData) => client.setQueryData(uploadKey, body),
		clear: () => setCreation(null),
		create,
	};
}

export type ShipmentCreationAccess = ReturnType<typeof useShipmentCreation>;
