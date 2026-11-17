import type { GuestSection } from "@/domain/shipment";

import { guestLinkInputSchema } from "../api/guestLink.dto";

const defaultLifetimeMs = 7 * 24 * 60 * 60 * 1000;
const dateTimeMinuteLength = 16;

export const emptyGuestLinkErrors = { name: "", expires: "", orders: "" };

export function guestLinkExpiration(value?: string) {
	const instant = value ?? Date.now() + defaultLifetimeMs;

	return new Date(instant).toISOString().slice(0, dateTimeMinuteLength);
}

function toUtcInput(value: string) {
	const missingSeconds = value.length === dateTimeMinuteLength;

	return missingSeconds ? `${value}:00Z` : `${value}Z`;
}

export function readGuestLinkForm(
	form: FormData,
	selection: {
		orderIds: string[];
		sections: GuestSection[];
		hasUnavailableOrders: boolean;
	},
	expiration: { initial: string; original: string | undefined },
) {
	const inputValue = form.get("expires");
	const original =
		inputValue === expiration.initial ? expiration.original : undefined;
	const utcInput =
		typeof inputValue === "string" ? toUtcInput(inputValue) : null;
	const date = guestLinkInputSchema.shape.expires_at.safeParse(
		original ?? utcInput,
	);
	const timestamp = date.success ? Date.parse(date.data) : NaN;
	const isFuture = timestamp > Date.now();

	const name = form.get("name");
	const errors = {
		name: guestLinkInputSchema.shape.name.safeParse(name).success
			? ""
			: "Укажите название ссылки.",
		expires: isFuture ? "" : "Укажите будущий срок действия.",
		orders: "",
	};

	if (selection.hasUnavailableOrders) {
		errors.orders = "Снимите выбор с недоступных заказов.";
	}

	if (!selection.orderIds.length) {
		errors.orders = "Выберите хотя бы один заказ.";
	}

	if (errors.name || errors.expires || errors.orders) return { errors };

	const expiresAt = original ?? new Date(timestamp).toISOString();
	const result = guestLinkInputSchema.safeParse({
		name,
		expires_at: expiresAt,
		order_ids: selection.orderIds,
		sections: selection.sections,
	});

	if (!result.success) {
		return {
			errors: { ...errors, orders: "Проверьте выбранные заказы и разделы." },
		};
	}

	return { errors, input: result.data };
}
