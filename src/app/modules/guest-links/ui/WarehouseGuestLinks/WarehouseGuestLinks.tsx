import { useState } from "react";

import { guestSections } from "@/domain/shipment";
import type { Warehouse } from "@/domain/warehouse";
import { useWarehouseResources } from "@/ports/warehouse";

import { ApiError, type FetchHttpClient, isStaleRevision } from "@/shared/http";
import { useGuestLinks } from "../../api/guestLinksApi";

import { type GuestLink, type GuestLinkInput } from "../../api/guestLink.dto";
import { formatMoment, errorMessage } from "@/shared/lib";
import { guestLinkCustomer } from "../../model/guestLinkCustomer";

import { Button } from "@/shared/ui/controls";
import { Feedback, RetryButton } from "@/shared/ui/feedback";

import { DeleteConfirmation, RevisionConflict } from "@/shared/ui/management";
import { IssuedGuestLink } from "../IssuedGuestLink/IssuedGuestLink";
import { GuestLinkForm } from "../GuestLinkForm/GuestLinkForm";
import { WarehouseGuestLinksList } from "../WarehouseGuestLinksList/WarehouseGuestLinksList";
import {
	type GuestLinkDialog,
	useGuestLinkActions,
} from "../../model/useGuestLinkActions";

export function WarehouseGuestLinks({
	path,
	warehouse,
	http,
	initialOrder,
}: {
	path: string;
	warehouse: Warehouse;
	http: FetchHttpClient;
	initialOrder: string | null;
}) {
	const resources = useWarehouseResources(warehouse, ["orders"]);
	const query = useGuestLinks(http, path);
	const [action, setAction] = useState<GuestLinkDialog | null>(
		initialOrder ? { type: "create" } : null,
	);

	const {
		mutation,
		attempt,
		acknowledgeUnknownCreation,
		issued,
		notice,
		handleSave: save,
		handleCopy,
		clearNotice,
	} = useGuestLinkActions(http, path, handleCloseDialog);
	const [hasCheckedUnknown, setHasCheckedUnknown] = useState(false);
	const orders = resources.warehouse.orders.filter(
		(order) => order.kind === "outbound",
	);
	const orderById = new Map(orders.map((order) => [order.id, order]));
	const activeIssuedLink =
		issued &&
		query.isSuccess &&
		query.data.items.some(
			(link) => link.id === issued.id && link.status === "active",
		)
			? issued
			: null;
	const denied =
		query.error instanceof ApiError && [401, 403].includes(query.error.status);
	const hasData = !denied && Boolean(query.data) && resources.hasData;
	const form = hasData && action?.type !== "revoke" ? action : null;
	const link = form?.type === "update" ? form.link : undefined;
	const revoke = action?.type === "revoke" ? action.link : null;
	const revokeCustomer = revoke ? guestLinkCustomer(revoke, orderById) : "";
	const hasConflict = Boolean(link && isStaleRevision(mutation.error));
	const latest = hasConflict
		? query.data?.items.find((item) => item.id === link?.id)
		: undefined;
	const replacement =
		latest?.status === "active" && latest.revision !== link?.revision
			? latest
			: undefined;
	const isBusy = mutation.isPending || attempt?.status === "pending";
	const isCreationBlocked = Boolean(attempt);
	const canAcknowledgeCreation =
		attempt?.status === "unknown" && hasCheckedUnknown && query.isSuccess;
	const isSaveDisabled =
		isBusy ||
		hasConflict ||
		!query.isSuccess ||
		Boolean(resources.error) ||
		(form?.type === "create" && isCreationBlocked);
	const formKey = link ? JSON.stringify([link.id, link.revision]) : "new";

	function handleCloseDialog() {
		setAction(null);
	}

	function handleOpenDialog(next: GuestLinkDialog) {
		mutation.reset();
		clearNotice();
		setAction(next);
	}

	function handleCreate() {
		handleOpenDialog({ type: "create" });
	}

	function handleEdit(link: GuestLink) {
		handleOpenDialog({ type: "update", link });
	}

	function handleRevoke(link: GuestLink) {
		handleOpenDialog({ type: "revoke", link });
	}

	function handleClose() {
		if (!isBusy) handleCloseDialog();
	}

	function handleConfirmRevoke() {
		if (revoke && !isBusy) mutation.mutate({ type: "revoke", id: revoke.id });
	}

	function handleSave(input: GuestLinkInput) {
		if (form && !isSaveDisabled) save(form, input);
	}

	function handleRestartEdit() {
		if (replacement) handleOpenDialog({ type: "update", link: replacement });
	}

	async function handleCheckCreation() {
		const current = await query.refetch();

		setHasCheckedUnknown(current.isSuccess);
	}

	function handleAcknowledgeCreation() {
		acknowledgeUnknownCreation();
		mutation.reset();
		setHasCheckedUnknown(false);
	}

	function handleRetryOrders() {
		void resources.retry();
	}

	function renderConflictDetails() {
		if (query.error)
			return <Feedback tone="error">{errorMessage(query.error)}</Feedback>;

		if (!latest || latest.status !== "active") {
			return <p>Ссылка больше недоступна для редактирования.</p>;
		}

		if (!replacement) return null;

		const expires = formatMoment(latest.expires_at, warehouse.timezone);
		const orderNumbers = latest.order_ids.map(
			(id) => orderById.get(id)?.number ?? id,
		);
		const sections = latest.sections.map((section) => guestSections[section]);

		return (
			<div>
				<p>Сохранено на сервере: «{latest.name}»</p>
				<p>Действует до {expires}</p>
				<p>Заказы: {orderNumbers.join(", ")}</p>
				<p>Разделы: {sections.join(", ") || "Только сведения о заказе"}</p>
			</div>
		);
	}

	const conflict = hasConflict && (
		<RevisionConflict
			details={renderConflictDetails()}
			onRefresh={query.refetch}
			onRestart={replacement ? handleRestartEdit : undefined}
		/>
	);

	return (
		<>
			{query.isPending && (
				<Feedback tone="loading">Загружаем гостевые ссылки…</Feedback>
			)}
			{query.error && (
				<Feedback tone="error" action={<RetryButton onRetry={query.refetch} />}>
					{errorMessage(query.error)}
				</Feedback>
			)}
			{resources.loading && (
				<Feedback tone="loading">Загружаем заказы…</Feedback>
			)}
			{resources.error && (
				<Feedback
					tone="error"
					action={<RetryButton onRetry={handleRetryOrders} />}
				>
					{errorMessage(resources.error)}
				</Feedback>
			)}
			{attempt?.status === "pending" && !form && (
				<Feedback tone="loading">Выпускаем гостевую ссылку…</Feedback>
			)}
			{attempt?.status === "unknown" && (
				<Feedback
					tone="warning"
					action={<RetryButton onRetry={handleCheckCreation} />}
				>
					Сервер мог выпустить ссылку «{attempt.input.name}». Проверьте список
					перед новым выпуском.
				</Feedback>
			)}
			{canAcknowledgeCreation && (
				<Button variant="secondary" onClick={handleAcknowledgeCreation}>
					Я проверил список, разрешить новый выпуск
				</Button>
			)}
			{notice && <Feedback tone={notice.tone}>{notice.text}</Feedback>}
			{activeIssuedLink && !denied && (
				<IssuedGuestLink url={activeIssuedLink.url} onCopy={handleCopy} />
			)}
			<WarehouseGuestLinksList
				warehouse={warehouse}
				orderById={orderById}
				links={query.isSuccess ? query.data.items : undefined}
				isSaving={isBusy}
				isCreationBlocked={isCreationBlocked || Boolean(resources.error)}
				onCreate={handleCreate}
				onCopy={handleCopy}
				onEdit={handleEdit}
				onRevoke={handleRevoke}
			/>
			{form && (
				<GuestLinkForm
					key={formKey}
					link={link}
					initialOrder={initialOrder}
					orders={orders}
					busy={isBusy}
					isSaveDisabled={isSaveDisabled}
					conflict={conflict}
					error={mutation.error}
					onClose={handleClose}
					onSave={handleSave}
				/>
			)}
			{revoke && !denied && (
				<DeleteConfirmation
					title="Удалить гостевую ссылку?"
					description={`Получатели ссылки «${revokeCustomer}» потеряют доступ к заказам.`}
					confirmLabel="Удалить ссылку"
					isPending={mutation.isPending}
					error={mutation.error}
					onClose={handleClose}
					onConfirm={handleConfirmRevoke}
				/>
			)}
		</>
	);
}
