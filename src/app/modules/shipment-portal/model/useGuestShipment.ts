import { useEffect, useState } from "react";
import { environment } from "@/shared/config";
import { ApiError, FetchHttpClient, parseResponse } from "@/shared/http";
import { guestShipmentsSchema } from "./guestShipment.dto";

const http = new FetchHttpClient(environment.apiBaseUrl, undefined, {
	refresh: false,
});

function guestHeaders(token: string) {
	return { Authorization: `Bearer ${token}` };
}

export function accessDenied(error: unknown) {
	return (
		error instanceof ApiError && [401, 403, 404, 410].includes(error.status)
	);
}

export function guestDownload(token: string, id: string, signal: AbortSignal) {
	return http.requestFile(
		`/public/shipments/documents/${encodeURIComponent(id)}/download`,
		{
			headers: guestHeaders(token),
			signal,
		},
	);
}

type State = {
	data?: ReturnType<typeof guestShipmentsSchema.parse>;
	checkedAt?: number;
	error?: "denied" | "temporary";
	loading: boolean;
};

export function useGuestShipment(token: string) {
	const [state, setState] = useState<State>({ loading: !!token });
	const [refreshSignal, setRefreshSignal] = useState(
		() => new AbortController(),
	);
	useEffect(() => {
		if (!token) return;
		const controller = new AbortController();
		const signal = AbortSignal.any([controller.signal, refreshSignal.signal]);
		let timer: number;
		async function load() {
			setState((current) => ({ ...current, loading: true }));
			try {
				const response = await http.request("/public/shipments", {
					headers: guestHeaders(token),
					privacy: true,
					signal: AbortSignal.any([signal, AbortSignal.timeout(15000)]),
				});
				if (!signal.aborted)
					setState({
						data: parseResponse(guestShipmentsSchema, response),
						checkedAt: Date.now(),
						loading: false,
					});
			} catch (error) {
				if (signal.aborted) return;
				setState((current) =>
					accessDenied(error)
						? { loading: false, error: "denied" }
						: {
								...current,
								loading: false,
								error: current.error === "denied" ? "denied" : "temporary",
							},
				);
			}
			if (!signal.aborted) timer = window.setTimeout(load, 30000);
		}
		void load();
		return () => {
			controller.abort();
			clearTimeout(timer);
		};
	}, [token, refreshSignal]);
	return {
		...state,
		retry: () => {
			refreshSignal.abort();
			setRefreshSignal(new AbortController());
		},
	};
}
