import { type Dispatch, type SetStateAction, useEffect, useState } from "react";
import {
	isGuestAccessDenied,
	type ReadGuestShipments,
} from "../api/guestShipmentApi";
import type { GuestShipments } from "../api/guestShipment.dto";

type State = {
	snapshot: { data: GuestShipments; checkedAt: number } | null;
	error: "denied" | "temporary" | null;
	isLoading: boolean;
};

function failedState(current: State, error: unknown): State {
	if (isGuestAccessDenied(error))
		return { snapshot: null, isLoading: false, error: "denied" };

	return {
		...current,
		isLoading: false,
		error: current.error === "denied" ? "denied" : "temporary",
	};
}

function pollGuestShipments(
	token: string,
	readShipment: ReadGuestShipments,
	refreshSignal: AbortSignal,
	setState: Dispatch<SetStateAction<State>>,
) {
	if (!token) return;

	const controller = new AbortController();
	const signal = AbortSignal.any([controller.signal, refreshSignal]);
	const refreshIntervalMs = 30_000;
	let timer: ReturnType<typeof setTimeout> | undefined;

	async function load() {
		setState((current) => ({ ...current, isLoading: true }));

		try {
			const data = await readShipment(token, signal);

			if (!signal.aborted)
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

export function useGuestShipment(
	token: string,
	readShipment: ReadGuestShipments,
) {
	const [state, setState] = useState<State>({
		snapshot: null,
		error: null,
		isLoading: !!token,
	});
	const [refresh, setRefresh] = useState(() => new AbortController());

	useEffect(
		() => pollGuestShipments(token, readShipment, refresh.signal, setState),
		[token, refresh, readShipment],
	);

	function retry() {
		refresh.abort();
		setRefresh(new AbortController());
	}

	return { ...state, retry };
}
