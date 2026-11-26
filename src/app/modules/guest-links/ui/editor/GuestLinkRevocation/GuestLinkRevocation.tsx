import type { Order } from "@/domain/warehouse";
import { DeleteConfirmation } from "@/shared/ui/management";

import type { GuestLink } from "../../../api/guestLink.dto";
import { guestLinkOrders } from "../../../model/guestLinkOrders";

export function GuestLinkRevocation({
	link,
	orderById,
	isPending,
	isBusy,
	error,
	onClose,
	onRevoke,
}: {
	link: GuestLink;
	orderById: ReadonlyMap<string, Order>;
	isPending: boolean;
	isBusy: boolean;
	error: Error | null;
	onClose: () => void;
	onRevoke: (id: string) => void;
}) {
	const linkName = link.name || link.id;
	const orders = guestLinkOrders(link, orderById)
		.map(({ label }) => label)
		.join(", ");
	const accessLoss = `Получатели ссылки «${linkName}» потеряют доступ к заказам.`;
	const description = orders
		? `${accessLoss} Заказы по ссылке: ${orders}.`
		: accessLoss;

	function handleConfirm() {
		if (!isBusy) onRevoke(link.id);
	}

	return (
		<DeleteConfirmation
			title="Отозвать гостевую ссылку?"
			description={description}
			confirmLabel="Отозвать ссылку"
			isPending={isPending}
			error={error}
			onClose={onClose}
			onConfirm={handleConfirm}
		/>
	);
}
