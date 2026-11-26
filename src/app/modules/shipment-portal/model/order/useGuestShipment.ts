import { useEffect, useState } from "react";

import type { ReadGuestShipments } from "../../api/guestShipmentApi";
import {
	type GuestShipmentState,
	pollGuestShipments,
} from "./guestShipmentPolling";

export function useGuestShipment(
	token: string,
	readShipment: ReadGuestShipments,
) {
	const [state, setState] = useState<GuestShipmentState>({
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
