import type { Dispatch, SetStateAction } from "react";

import { isGuestAccessDenied } from "../../api/guestAccessDenied";
import type { GuestShipments } from "../../api/guestShipment.dto";
import type { ReadGuestShipments } from "../../api/guestShipmentApi";

const refreshIntervalMs = 30_000;

export type GuestShipmentState = {
	snapshot: { data: GuestShipments; checkedAt: number } | null;
	error: "denied" | "temporary" | null;
	isLoading: boolean;
};

function failedState(
	current: GuestShipmentState,
	error: unknown,
): GuestShipmentState {
	if (isGuestAccessDenied(error))
		return { snapshot: null, isLoading: false, error: "denied" };

	return {
		...current,
		isLoading: false,
		error: current.error === "denied" ? "denied" : "temporary",
	};
}

export function pollGuestShipments(
	token: string,
	readShipment: ReadGuestShipments,
	refreshSignal: AbortSignal,
	setState: Dispatch<SetStateAction<GuestShipmentState>>,
) {
	if (!token) return;

	const controller = new AbortController();
	const signal = AbortSignal.any([controller.signal, refreshSignal]);
	let timer: ReturnType<typeof setTimeout> | undefined;

	async function load() {
		setState((current) => ({ ...current, isLoading: true }));

		try {
			const data = await readShipment(token, signal);

			if (signal.aborted) return;

			setState({
				snapshot: { data, checkedAt: Date.now() },
				error: null,
				isLoading: false,
			});
		} catch (error) {
			if (signal.aborted) return;

			setState((current) => failedState(current, error));
		}

		if (!signal.aborted) timer = setTimeout(load, refreshIntervalMs);
	}

	void load();

	return () => {
		controller.abort();
		clearTimeout(timer);
	};
}
