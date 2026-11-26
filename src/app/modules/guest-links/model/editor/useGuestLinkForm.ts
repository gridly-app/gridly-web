import { type FormEvent, useRef, useState } from "react";

import type { GuestSection } from "@/domain/shipment";
import type { Order } from "@/domain/warehouse";

import type { GuestLink, GuestLinkInput } from "../../api/guestLink.dto";
import {
	emptyGuestLinkErrors,
	guestLinkExpiration,
	readGuestLinkForm,
} from "./guestLinkForm";
import { guestLinkOrderOptions } from "../guestLinkOrders";

export function useGuestLinkForm({
	link,
	initialOrder,
	orders,
	isSaveDisabled,
	onSave,
}: {
	link: GuestLink | undefined;
	initialOrder: string | null;
	orders: Pick<Order, "id" | "number" | "party">[];
	isSaveDisabled: boolean;
	onSave: (input: GuestLinkInput) => void;
}) {
	const [orderIds, setOrderIds] = useState<string[]>(() => [
		...new Set(link?.order_ids ?? (initialOrder ? [initialOrder] : [])),
	]);
	const [sections, setSections] = useState<GuestSection[]>(() => [
		...new Set(link?.sections),
	]);
	const {
		orderOptions,
		selectedOrderIds,
		selectedOrders,
		hasUnavailableOrders,
	} = guestLinkOrderOptions(orders, orderIds);
	const [validation, setValidation] = useState(emptyGuestLinkErrors);
	const [expires] = useState(() => guestLinkExpiration(link?.expires_at));
	const validationRef = useRef<HTMLParagraphElement>(null);

	function handleOrderCheck(id: string, checked: boolean) {
		setOrderIds((current) => {
			if (!checked) return current.filter((value) => value !== id);

			return current.includes(id) ? current : [...current, id];
		});
	}

	function handleSectionCheck(section: GuestSection, checked: boolean) {
		setSections((current) =>
			checked
				? [...current, section]
				: current.filter((value) => value !== section),
		);
	}

	function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();

		if (isSaveDisabled) return;

		const selection = {
			orderIds,
			sections,
			hasUnavailableOrders,
		};
		const expiration = {
			initialFieldValue: expires,
			storedExpiresAt: link?.expires_at,
		};
		const data = new FormData(event.currentTarget);
		const { errors, input } = readGuestLinkForm(data, selection, expiration);

		setValidation(errors);

		if (errors.orders)
			requestAnimationFrame(() => validationRef.current?.focus());
		if (input) onSave(input);
	}

	return {
		orderOptions,
		selectedOrderIds,
		selectedOrders,
		hasUnavailableOrders,
		sections,
		validation,
		expires,
		validationRef,
		handleOrderCheck,
		handleSectionCheck,
		handleSubmit,
	};
}
