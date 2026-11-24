import { ApiError, type FetchHttpClient, parseResponse } from "@/shared/http";
import { guestShipmentsSchema, type GuestShipments } from "./guestShipment.dto";

const requestTimeoutMs = 15_000;

export type ReadGuestShipments = (
	token: string,
	signal: AbortSignal,
) => Promise<GuestShipments>;
export type DownloadGuestDocument = (
	token: string,
	id: string,
	signal: AbortSignal,
) => Promise<Response>;

export function isGuestAccessDenied(error: unknown) {
	return (
		error instanceof ApiError && [401, 403, 404, 410].includes(error.status)
	);
}

function guestHeaders(token: string) {
	return { Authorization: `Bearer ${token}` };
}

export class GuestShipmentApi {
	constructor(
		private readonly http: Pick<FetchHttpClient, "request" | "requestFile">,
	) {}

	readonly read: ReadGuestShipments = async (token, signal) => {
		const response = await this.http.request("/public/shipments", {
			headers: guestHeaders(token),
			privacy: true,
			signal: AbortSignal.any([signal, AbortSignal.timeout(requestTimeoutMs)]),
		});

		return parseResponse(guestShipmentsSchema, response);
	};

	readonly download: DownloadGuestDocument = (token, id, signal) => {
		return this.http.requestFile(
			`/public/shipments/documents/${encodeURIComponent(id)}/download`,
			{
				headers: guestHeaders(token),
				signal,
			},
		);
	};
}
