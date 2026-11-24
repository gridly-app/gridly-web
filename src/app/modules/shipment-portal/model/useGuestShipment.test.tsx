import { expect, test } from "bun:test";
import { act } from "react";
import { ApiError } from "@/shared/http";
import { mountDom } from "../../../../../tests/support/dom";
import { shipment } from "../../../../../tests/support/shipment";
import type { ReadGuestShipments } from "../api/guestShipmentApi";
import type { GuestShipments } from "../api/guestShipment.dto";
import { useGuestShipment } from "./useGuestShipment";

function snapshot(number: string): GuestShipments {
	const sample = shipment();
	sample.order.number = number;

	return { orders: [{ ...sample, id: "guest-1", sections: ["calendar"] }] };
}

function mountGuest(readShipment: ReadGuestShipments) {
	const dom = mountDom();
	let current: ReturnType<typeof useGuestShipment> | undefined;

	function Guest() {
		current = useGuestShipment("guest-token", readShipment);

		return null;
	}

	async function render() {
		await act(async () => {
			dom.root.render(<Guest />);
		});
	}

	function read() {
		if (!current) throw new Error("Guest shipment did not render");

		return current;
	}

	return { ...dom, render, read };
}

test("refresh cancels the old read and ignores its late response", async () => {
	const first = Promise.withResolvers<GuestShipments>();
	const second = Promise.withResolvers<GuestShipments>();
	const signals: AbortSignal[] = [];
	const model = mountGuest((_token, signal) => {
		signals.push(signal);

		return signals.length === 1 ? first.promise : second.promise;
	});

	try {
		await model.render();
		act(() => model.read().retry());

		expect(signals[0]?.aborted).toBe(true);

		await act(async () => {
			second.resolve(snapshot("NEW"));
		});
		await act(async () => {
			first.resolve(snapshot("OLD"));
		});

		expect(model.read().snapshot?.data.orders[0]?.order.number).toBe("NEW");
		expect(model.read().isLoading).toBe(false);
	} finally {
		await model.close();
	}

	expect(signals[1]?.aborted).toBe(true);
});

test("a temporary failure keeps the snapshot but denied access clears it", async () => {
	let attempts = 0;
	const model = mountGuest(async () => {
		attempts++;

		if (attempts === 2) throw new ApiError("Unavailable", 503);
		if (attempts === 3) throw new ApiError("Denied", 403);

		return snapshot("OUT-1");
	});

	try {
		await model.render();
		await act(async () => model.read().retry());

		expect(model.read().snapshot?.data.orders[0]?.order.number).toBe("OUT-1");
		expect(model.read().error).toBe("temporary");

		await act(async () => model.read().retry());

		expect(model.read().snapshot).toBeNull();
		expect(model.read().error).toBe("denied");
	} finally {
		await model.close();
	}
});
