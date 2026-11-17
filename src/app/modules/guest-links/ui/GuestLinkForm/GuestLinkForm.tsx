import { type FormEvent, type ReactNode, useId, useRef, useState } from "react";

import {
	type GuestSection,
	guestSectionSchema,
	guestSections,
} from "@/domain/shipment";
import type { Order } from "@/domain/warehouse";

import {
	type GuestLink,
	type GuestLinkInput,
	guestLinkNameMaxLength,
} from "../../api/guestLink.dto";
import {
	emptyGuestLinkErrors,
	guestLinkExpiration,
	readGuestLinkForm,
} from "../../model/guestLinkForm";

import { errorMessage } from "@/shared/lib";
import { Button, Checkbox, Input } from "@/shared/ui/controls";
import { Feedback } from "@/shared/ui/feedback";
import { Field } from "@/shared/ui/forms";
import { Modal } from "@/shared/ui/overlays";

import { GuestOrderPicker } from "../GuestOrderPicker/GuestOrderPicker";
import { GuestLinkPreview } from "../GuestLinkPreview/GuestLinkPreview";

import { managementStyles as styles } from "@/shared/ui/management";

export function GuestLinkForm({
	link,
	initialOrder,
	orders,
	onClose,
	onSave,
	busy,
	isSaveDisabled,
	conflict,
	error,
}: {
	link: GuestLink | undefined;
	initialOrder: string | null;
	orders: Pick<Order, "id" | "number" | "party">[];
	onClose: () => void;
	onSave: (data: GuestLinkInput) => void;
	busy: boolean;
	isSaveDisabled: boolean;
	conflict: ReactNode;
	error: unknown;
}) {
	const [orderIds, setOrderIds] = useState<string[]>(() => [
		...new Set(link?.order_ids ?? (initialOrder ? [initialOrder] : [])),
	]);
	const [sections, setSections] = useState<GuestSection[]>(() => [
		...new Set(link?.sections),
	]);
	const fieldId = useId();
	const availableIds = new Set(orders.map(({ id }) => id));
	const unavailable = orderIds
		.filter((id) => !availableIds.has(id))
		.map((id) => ({ id, number: id, party: "Заказ недоступен" }));
	const options = [...orders, ...unavailable];
	const selectedIds = new Set(orderIds);
	const selectedOrders = orders.filter(({ id }) => selectedIds.has(id));
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
			hasUnavailableOrders: unavailable.length > 0,
		};
		const expiration = { initial: expires, original: link?.expires_at };
		const { errors, input } = readGuestLinkForm(
			new FormData(event.currentTarget),
			selection,
			expiration,
		);
		setValidation(errors);

		if (errors.orders)
			requestAnimationFrame(() => validationRef.current?.focus());
		if (input) onSave(input);
	}

	return (
		<Modal
			wide
			title={link ? "Изменить гостевую ссылку" : "Новая гостевая ссылка"}
			onClose={onClose}
		>
			<form className={styles.form} method="post" onSubmit={handleSubmit}>
				<div className={styles.editorColumns}>
					<Field label="Название" error={validation.name}>
						<Input
							name="name"
							required
							maxLength={guestLinkNameMaxLength}
							defaultValue={link?.name}
						/>
					</Field>
					<Field label="Действует до (UTC)" error={validation.expires}>
						<Input
							name="expires"
							type="datetime-local"
							required
							defaultValue={expires}
						/>
					</Field>
				</div>
				<div className={styles.editorColumns}>
					<div className={styles.form}>
						<GuestOrderPicker
							orders={options}
							selectedIds={selectedIds}
							onCheck={handleOrderCheck}
						/>
						<fieldset className={styles.fieldset}>
							<legend className={styles.legend}>Доступные разделы</legend>
							{guestSectionSchema.options.map((section) => {
								const id = `${fieldId}-section-${section}`;
								const handleCheck = (checked: boolean) =>
									handleSectionCheck(section, checked);

								return (
									<label key={section} className={styles.checkRow} htmlFor={id}>
										<Checkbox
											id={id}
											checked={sections.includes(section)}
											onCheckedChange={handleCheck}
										/>
										{guestSections[section]}
									</label>
								);
							})}
						</fieldset>
					</div>
					<GuestLinkPreview
						selectedOrders={selectedOrders}
						hasUnavailableOrders={unavailable.length > 0}
						sections={sections}
					/>
				</div>
				<p
					ref={validationRef}
					role="alert"
					tabIndex={-1}
					hidden={!validation.orders}
				>
					{validation.orders}
				</p>
				{conflict}
				{error != null && !conflict && (
					<Feedback tone="error">{errorMessage(error)}</Feedback>
				)}
				<div className={styles.actions}>
					<Button variant="secondary" onClick={onClose} disabled={busy}>
						Отмена
					</Button>
					<Button type="submit" disabled={isSaveDisabled}>
						{link ? "Сохранить доступ" : "Выпустить ссылку"}
					</Button>
				</div>
			</form>
		</Modal>
	);
}
