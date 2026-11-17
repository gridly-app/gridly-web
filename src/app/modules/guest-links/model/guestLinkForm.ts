import type { GuestSection } from "@/domain/shipment";
import { parseUtcDateTimeInput, toUtcDateTimeInput } from "@/shared/lib";

import { guestLinkInputSchema } from "../api/guestLink.dto";

const defaultLifetimeMs = 7 * 24 * 60 * 60 * 1000;

export const emptyGuestLinkErrors = {
	name: "",
	expires: "",
	orders: "",
	sections: "",
};

export function guestLinkExpiration(value?: string) {
	const instant = value ?? Date.now() + defaultLifetimeMs;

	return toUtcDateTimeInput(instant, "minute");
}

export function readGuestLinkForm(
	form: FormData,
	selection: {
		orderIds: string[];
		sections: GuestSection[];
		hasUnavailableOrders: boolean;
	},
	expiration: {
		initialFieldValue: string;
		storedExpiresAt: string | undefined;
	},
) {
	const inputValue = form.get("expires");
	const hasUnchangedExpiry = inputValue === expiration.initialFieldValue;
	const storedExpiresAt = hasUnchangedExpiry
		? expiration.storedExpiresAt
		: undefined;
	const utcInput =
		typeof inputValue === "string" ? parseUtcDateTimeInput(inputValue) : null;
	const expiresAt = storedExpiresAt ?? utcInput;
	const result = guestLinkInputSchema.safeParse({
		name: form.get("name"),
		expires_at: expiresAt,
		order_ids: selection.orderIds,
		sections: selection.sections,
	});
	const timestamp = expiresAt === null ? NaN : Date.parse(expiresAt);
	const expiryError = "Укажите будущий срок действия.";
	const errors = {
		...emptyGuestLinkErrors,
		expires: timestamp > Date.now() ? "" : expiryError,
		orders: selection.hasUnavailableOrders
			? "Снимите выбор с недоступных заказов."
			: "",
	};

	if (!result.success) {
		const invalidFields = new Set(
			result.error.issues.map(({ path }) => path[0]),
		);

		if (invalidFields.has("name")) errors.name = "Укажите название ссылки.";
		if (invalidFields.has("expires_at")) errors.expires = expiryError;
		if (invalidFields.has("sections"))
			errors.sections = "Проверьте выбранные разделы.";

		if (!selection.orderIds.length) {
			errors.orders = "Выберите хотя бы один заказ.";
		}

		if (!errors.orders && invalidFields.has("order_ids")) {
			errors.orders = "Проверьте выбранные заказы.";
		}

		return { errors };
	}

	if (errors.expires || errors.orders) return { errors };

	return { errors, input: result.data };
}
