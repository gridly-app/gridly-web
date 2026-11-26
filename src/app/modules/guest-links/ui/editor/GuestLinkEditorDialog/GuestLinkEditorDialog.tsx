import { isStaleRevision } from "@/shared/http";
import { errorMessage } from "@/shared/lib";
import { Button } from "@/shared/ui/controls";
import { Feedback } from "@/shared/ui/feedback";

import type { GuestLink, GuestLinkInput } from "../../../api/guestLink.dto";
import type {
	GuestLinkEditor,
	useGuestLinkActions,
} from "../../../model/editor/useGuestLinkActions";
import type { WarehouseGuestLinkData } from "../../../model/useWarehouseGuestLinkData";
import { GuestLinkForm } from "../GuestLinkForm/GuestLinkForm";
import { GuestLinkConflict } from "../GuestLinkConflict/GuestLinkConflict";

export function GuestLinkEditorDialog({
	editor,
	initialOrder,
	data,
	actions,
	onClose,
	onRestart,
}: {
	editor: GuestLinkEditor;
	initialOrder: string | null;
	data: Pick<
		WarehouseGuestLinkData,
		"orders" | "orderById" | "timezone" | "query" | "canWrite"
	>;
	actions: Pick<
		ReturnType<typeof useGuestLinkActions>,
		"creation" | "changeError" | "isBusy" | "saveLink"
	>;
	onClose: () => void;
	onRestart: (link: GuestLink) => void;
}) {
	const { creation, changeError, isBusy, saveLink } = actions;
	const isCreating = editor.type === "create";
	const editedLink = editor.type === "update" ? editor.link : undefined;
	const conflictedLink = isStaleRevision(changeError) ? editedLink : undefined;
	const creationAttempt = isCreating ? creation.attempt : null;
	const error = isCreating ? creation.error : changeError;
	const isSaveDisabled =
		isBusy || !data.canWrite || Boolean(conflictedLink || creationAttempt);
	const editorKey = editedLink
		? JSON.stringify([editedLink.id, editedLink.revision])
		: "new";

	function handleSave(input: GuestLinkInput) {
		if (!isSaveDisabled) saveLink(editor, input);
	}

	function renderFeedback() {
		if (conflictedLink) {
			return (
				<GuestLinkConflict
					editedLink={conflictedLink}
					links={data.query.data?.items}
					error={data.query.error}
					orderById={data.orderById}
					timezone={data.timezone}
					onRefresh={data.query.refetch}
					onRestart={onRestart}
				/>
			);
		}

		if (creationAttempt?.status === "unknown") {
			const action = (
				<Button type="button" variant="secondary" onClick={onClose}>
					Перейти к списку
				</Button>
			);

			return (
				<Feedback tone="warning" action={action}>
					Сервер мог выпустить ссылку «{creationAttempt.input.name}». Проверьте
					список перед новым выпуском.
				</Feedback>
			);
		}

		return error == null ? null : (
			<Feedback tone="error">{errorMessage(error)}</Feedback>
		);
	}

	return (
		<GuestLinkForm
			key={editorKey}
			link={editedLink}
			initialOrder={initialOrder}
			orders={data.orders}
			isBusy={isBusy}
			isSaveDisabled={isSaveDisabled}
			feedback={renderFeedback()}
			onClose={onClose}
			onSave={handleSave}
		/>
	);
}
