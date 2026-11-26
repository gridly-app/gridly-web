import { IconLink } from "@tabler/icons-react";
import { useState } from "react";

import {
	type GuestSection,
	guestSectionSchema,
	guestSections,
} from "@/domain/shipment";
import type { Order } from "@/domain/warehouse";

import { Combobox } from "@/shared/ui/forms";

import { managementStyles } from "@/shared/ui/management";
import styles from "./GuestLinkPreview.module.css";

export function GuestLinkPreview({
	selectedOrders,
	hasUnavailableOrders,
	sections,
}: {
	selectedOrders: Pick<Order, "id" | "number" | "party">[];
	hasUnavailableOrders: boolean;
	sections: GuestSection[];
}) {
	const [previewOrder, setPreviewOrder] = useState("");
	const preview =
		selectedOrders.find(({ id }) => id === previewOrder) ?? selectedOrders[0];
	const options = selectedOrders.map(({ id, number }) => ({
		value: id,
		label: number,
	}));
	const previewSections = guestSectionSchema.options.filter((section) =>
		sections.includes(section),
	);

	return (
		<section className={styles.preview} aria-label="Предпросмотр доступа">
			<h3 className={`${managementStyles.actions} ${styles.title}`}>
				<IconLink size={16} aria-hidden="true" /> Что увидит гость
			</h3>
			{selectedOrders.length > 1 && (
				<Combobox
					aria-label="Заказ для предпросмотра"
					value={preview?.id}
					onValueChange={setPreviewOrder}
					options={options}
				/>
			)}
			{hasUnavailableOrders && (
				<p className={managementStyles.subtle}>
					Недоступные заказы исключены из предпросмотра.
				</p>
			)}
			{preview ? (
				<>
					<strong>Заказ {preview.number}</strong>
					<span className={managementStyles.subtle}>{preview.party}</span>
					<ul className={styles.sections}>
						<li className={styles.section}>Сведения о заказе и статус</li>
						{previewSections.map((section) => (
							<li className={styles.section} key={section}>
								{guestSections[section]}
							</li>
						))}
					</ul>
				</>
			) : (
				<p className={managementStyles.subtle}>
					Выберите заказ, чтобы увидеть доступные разделы.
				</p>
			)}
		</section>
	);
}
