import type { ReactNode } from "react";

import type { Order } from "@/domain/warehouse";

import type { GuestLink, GuestLinkInput } from "../../api/guestLink.dto";
import { useGuestLinkForm } from "../../model/useGuestLinkForm";

import { Button } from "@/shared/ui/controls";
import { Modal } from "@/shared/ui/overlays";

import { GuestLinkFields } from "../GuestLinkFields/GuestLinkFields";
import { GuestLinkSectionPicker } from "../GuestLinkSectionPicker/GuestLinkSectionPicker";
import { GuestOrderPicker } from "../GuestOrderPicker/GuestOrderPicker";
import { GuestLinkPreview } from "../GuestLinkPreview/GuestLinkPreview";

import { managementStyles as styles } from "@/shared/ui/management";

export function GuestLinkForm({
	link,
	initialOrder,
	orders,
	onClose,
	onSave,
	isBusy,
	isSaveDisabled,
	feedback,
}: {
	link: GuestLink | undefined;
	initialOrder: string | null;
	orders: Pick<Order, "id" | "number" | "party">[];
	onClose: () => void;
	onSave: (data: GuestLinkInput) => void;
	isBusy: boolean;
	isSaveDisabled: boolean;
	feedback: ReactNode;
}) {
	const form = useGuestLinkForm({
		link,
		initialOrder,
		orders,
		isSaveDisabled,
		onSave,
	});
	const { validation } = form;

	return (
		<Modal
			wide
			title={link ? "Изменить гостевую ссылку" : "Новая гостевая ссылка"}
			onClose={onClose}
		>
			<form className={styles.form} method="post" onSubmit={form.handleSubmit}>
				<GuestLinkFields
					name={link?.name}
					expires={form.expires}
					disabled={isBusy}
					errors={validation}
				/>
				<div className={styles.editorColumns}>
					<div className={styles.form}>
						<GuestOrderPicker
							orders={form.orderOptions}
							disabled={isBusy}
							selectedIds={form.selectedOrderIds}
							onCheck={form.handleOrderCheck}
						/>
						<GuestLinkSectionPicker
							sections={form.sections}
							disabled={isBusy}
							error={validation.sections}
							onCheck={form.handleSectionCheck}
						/>
					</div>
					<GuestLinkPreview
						selectedOrders={form.selectedOrders}
						hasUnavailableOrders={form.hasUnavailableOrders}
						sections={form.sections}
					/>
				</div>
				<p
					ref={form.validationRef}
					role="alert"
					tabIndex={-1}
					hidden={!validation.orders}
				>
					{validation.orders}
				</p>
				{feedback}
				<div className={styles.actions}>
					<Button variant="secondary" onClick={onClose} disabled={isBusy}>
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
