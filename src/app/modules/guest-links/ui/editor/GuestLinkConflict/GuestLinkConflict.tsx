import { guestSections } from "@/domain/shipment";
import type { Order, Warehouse } from "@/domain/warehouse";

import { errorMessage, formatMoment } from "@/shared/lib";
import { Feedback } from "@/shared/ui/feedback";
import { RevisionConflict } from "@/shared/ui/management";

import type { GuestLink } from "../../../api/guestLink.dto";
import { guestLinkOrders } from "../../../model/guestLinkOrders";

export function GuestLinkConflict({
	editedLink,
	links,
	error,
	orderById,
	timezone,
	onRefresh,
	onRestart,
}: {
	editedLink: GuestLink;
	links: GuestLink[] | undefined;
	error: unknown;
	orderById: ReadonlyMap<string, Order>;
	timezone: Warehouse["timezone"];
	onRefresh: () => Promise<unknown>;
	onRestart: (link: GuestLink) => void;
}) {
	if (error) {
		const details = <Feedback tone="error">{errorMessage(error)}</Feedback>;

		return <RevisionConflict details={details} onRefresh={onRefresh} />;
	}

	const latestLink = links?.find(({ id }) => id === editedLink.id);

	if (latestLink?.status !== "active") {
		const details = <p>Ссылка больше недоступна для редактирования.</p>;

		return <RevisionConflict details={details} onRefresh={onRefresh} />;
	}

	if (latestLink.revision === editedLink.revision)
		return <RevisionConflict onRefresh={onRefresh} />;

	const { name, expires_at, sections } = latestLink;
	const expires = formatMoment(expires_at, timezone);
	const orderNumbers = guestLinkOrders(latestLink, orderById)
		.map(({ label }) => label)
		.join(", ");
	const sectionNames = sections
		.map((section) => guestSections[section])
		.join(", ");
	const sectionText = sectionNames || "Только сведения о заказе";
	const serverDetails = (
		<div>
			<p>Сохранено на сервере: «{name}»</p>
			<p>Действует до {expires}</p>
			<p>Заказы: {orderNumbers}</p>
			<p>Разделы: {sectionText}</p>
		</div>
	);

	function handleRestart() {
		if (latestLink) onRestart(latestLink);
	}

	return (
		<RevisionConflict
			details={serverDetails}
			onRefresh={onRefresh}
			onRestart={handleRestart}
		/>
	);
}
