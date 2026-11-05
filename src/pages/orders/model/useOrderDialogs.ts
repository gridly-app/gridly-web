import { useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
	type CommandExecutor,
	type OrderInput,
	useOrder,
	type Warehouse,
} from "@/entities/warehouse";
import { errorMessage } from "@/shared/lib";
import {
	initialOrderForm,
	type OrderFormDrafts,
	type OrderFormValues,
	type SavedOrderForm,
} from "./orderFormDrafts";

type CreationFlow =
	| { kind: "closed" | "choosing" }
	| { kind: "editing" | "confirming" | "submitting"; creation: Creation };

type Creation = { id: string; values: OrderFormValues; baseline: string };

export function useOrderDialogs(
	warehouse: Warehouse,
	execute: CommandExecutor,
	drafts: OrderFormDrafts,
) {
	const [flow, setFlow] = useState<CreationFlow>({ kind: "closed" });
	const creation = "creation" in flow ? flow.creation : null;
	const choosing = flow.kind === "choosing";
	const confirmClose = flow.kind === "confirming";
	const submitting = flow.kind === "submitting";
	function setCreation(
		value: Creation | null | ((current: Creation | null) => Creation | null),
	) {
		setFlow((current) => {
			const previous = "creation" in current ? current.creation : null;
			const next = typeof value === "function" ? value(previous) : value;
			return next
				? {
						kind: "creation" in current ? current.kind : "editing",
						creation: next,
					}
				: { kind: "closed" };
		});
	}
	function setChoosing(open: boolean) {
		setFlow((current) =>
			open
				? { kind: "choosing" }
				: current.kind === "choosing"
					? { kind: "closed" }
					: current,
		);
	}
	function setConfirmClose(open: boolean) {
		setFlow((current) =>
			"creation" in current
				? { ...current, kind: open ? "confirming" : "editing" }
				: current,
		);
	}
	function setSubmitting(active: boolean) {
		setFlow((current) =>
			"creation" in current
				? { ...current, kind: active ? "submitting" : "editing" }
				: current,
		);
	}

	const [initialForms] = useState(() => {
		try {
			return { forms: drafts.read(), error: "" };
		} catch {
			return {
				forms: [] as SavedOrderForm[],
				error:
					"Не удалось прочитать сохранённые формы. Проверьте доступность хранилища браузера и повторите открытие формы.",
			};
		}
	});
	const [savedForms, setSavedForms] = useState(initialForms.forms);

	const [formError, setFormError] = useState(initialForms.error);

	const inFlight = useRef(false);
	const [params, setParams] = useSearchParams();
	const detail = params.get("order");
	const detailGeneration = useRef(0);
	const [editing, setEditing] = useState(false);
	const orderQuery = useOrder(warehouse.id, detail);
	const selected = orderQuery.supported
		? orderQuery.data
		: warehouse.orders.find((order) => order.id === detail);

	function newForm() {
		if (inFlight.current) return;
		const values = initialOrderForm(warehouse);
		setCreation({
			id: crypto.randomUUID(),
			values,
			baseline: JSON.stringify(values),
		});
		setChoosing(false);
		setFormError("");
	}
	function openCreation() {
		if (inFlight.current || creation) return;
		try {
			const forms = drafts.read();
			setSavedForms(forms);
			setFormError("");
			if (forms.length) setChoosing(true);
			else newForm();
		} catch {
			setFormError(
				"Не удалось прочитать сохранённые формы. Проверьте доступность хранилища браузера и повторите открытие формы.",
			);
		}
	}
	function restoreForm(form: SavedOrderForm) {
		setCreation({
			id: form.id,
			values: form.values,
			baseline: JSON.stringify(form.values),
		});
		setChoosing(false);
		setFormError("");
	}
	function changeValues(values: OrderFormValues) {
		if (inFlight.current) return;
		setCreation((current) => (current ? { ...current, values } : current));
	}
	function closeCreation() {
		if (inFlight.current) return;
		if (creation && JSON.stringify(creation.values) !== creation.baseline)
			setConfirmClose(true);
		else setCreation(null);
	}
	function saveForm() {
		if (!creation || inFlight.current) return;
		try {
			setSavedForms(
				drafts.save({
					id: creation.id,
					values: creation.values,
					updatedAt: new Date().toISOString(),
				}),
			);
			setCreation(null);
			setConfirmClose(false);
			setFormError("");
		} catch (error) {
			setFormError(`Не удалось сохранить форму: ${errorMessage(error)}`);
		}
	}
	function deleteForm(id: string) {
		if (inFlight.current) return false;
		try {
			setSavedForms(drafts.remove(id));
			setFormError("");
			return true;
		} catch (error) {
			setFormError(`Не удалось удалить форму: ${errorMessage(error)}`);
			return false;
		}
	}
	function discardForm() {
		if (!creation || !deleteForm(creation.id)) return;
		setCreation(null);
		setConfirmClose(false);
	}
	async function createDraft(order: OrderInput) {
		if (!creation || inFlight.current) return;
		const formId = creation.id;
		inFlight.current = true;
		setSubmitting(true);
		try {
			await execute("order", order, { operationId: formId });
			try {
				setSavedForms(drafts.remove(formId));
			} catch {
				setFormError(
					"Заказ создан, но сохранённую форму не удалось удалить. Удалите её перед повторным использованием.",
				);
			}
			setCreation((current) => (current?.id === formId ? null : current));
		} finally {
			inFlight.current = false;
			setSubmitting(false);
		}
	}
	function setDetail(id: string | null, highlightUnpriced = false) {
		detailGeneration.current++;
		setParams(
			(current) => {
				const next = new URLSearchParams(current);
				if (id) next.set("order", id);
				else {
					next.delete("order");
					next.delete("highlight");
				}
				if (highlightUnpriced) next.set("highlight", "unpriced");
				return next;
			},
			{ replace: true },
		);
		setEditing(false);
	}
	function closeOrder() {
		setDetail(null);
	}
	async function saveDraft(order: OrderInput) {
		const generation = detailGeneration.current;
		await execute("order", order);
		if (generation === detailGeneration.current) setEditing(false);
	}
	return {
		creation,
		savedForms,
		choosing,
		confirmClose,
		formError,
		submitting,
		openCreation,
		newForm,
		restoreForm,
		changeValues,
		closeCreation,
		saveForm,
		discardForm,
		deleteForm,
		closeChooser: () => setChoosing(false),
		continueForm: () => {
			setConfirmClose(false);
			setFormError("");
		},
		setDetail,
		selected,
		editing,
		closeOrder,
		createDraft,
		saveDraft,
		fetching: orderQuery.isFetching || orderQuery.isError,
		detailOpen: detail !== null,
		detailError: orderQuery.error ? errorMessage(orderQuery.error) : "",
		retryDetail: () => {
			void orderQuery.refetch();
		},
		editSelected: () => setEditing(true),
	};
}
