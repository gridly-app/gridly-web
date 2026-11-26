import { useReducer, useRef, useState } from "react";
import type { CommandExecutor, OrderInput } from "@/domain/warehouse";
import { errorMessage } from "@/shared/lib";
import {
	initialOrderForm,
	type OrderFormDrafts,
	type OrderFormValues,
	type SavedOrderForm,
} from "./orderFormDrafts";
import type { OrderScreenWarehouse } from "./warehouseFields";

type Creation = { id: string; values: OrderFormValues; baseline: string };

type CreationFlow =
	| { kind: "closed" | "choosing" }
	| { kind: "editing" | "confirming" | "submitting"; creation: Creation };

type CreationEvent =
	| { type: "choose" }
	| { type: "closeChooser" }
	| { type: "start"; creation: Creation }
	| { type: "change"; values: OrderFormValues }
	| { type: "askToClose" }
	| { type: "continue" }
	| { type: "submit" }
	| { type: "submitted"; formId: string }
	| { type: "submitEnded" }
	| { type: "close" };

const closedFlow: CreationFlow = { kind: "closed" };

export function creationFlowReducer(
	flow: CreationFlow,
	event: CreationEvent,
): CreationFlow {
	switch (event.type) {
		case "choose":
			return { kind: "choosing" };
		case "closeChooser":
			return flow.kind === "choosing" ? closedFlow : flow;
		case "start":
			return { kind: "editing", creation: event.creation };
		case "close":
			return closedFlow;
	}

	if (!("creation" in flow)) return flow;

	switch (event.type) {
		case "change":
			return { ...flow, creation: { ...flow.creation, values: event.values } };
		case "askToClose":
			return { ...flow, kind: "confirming" };
		case "continue":
			return { ...flow, kind: "editing" };
		case "submit":
			return { ...flow, kind: "submitting" };
		case "submitted":
			return flow.creation.id === event.formId ? closedFlow : flow;
		case "submitEnded":
			return { ...flow, kind: "editing" };
	}
}

function startCreation(id: string, values: OrderFormValues): Creation {
	return { id, values, baseline: JSON.stringify(values) };
}

const formsReadError =
	"Не удалось прочитать сохранённые формы. Проверьте доступность хранилища браузера и повторите открытие формы.";

export function useOrderCreation(
	warehouse: OrderScreenWarehouse,
	execute: CommandExecutor,
	drafts: OrderFormDrafts,
) {
	const [flow, dispatch] = useReducer(creationFlowReducer, closedFlow);
	const creation = "creation" in flow ? flow.creation : null;
	const choosing = flow.kind === "choosing";
	const confirmClose = flow.kind === "confirming";
	const submitting = flow.kind === "submitting";

	const [initialForms] = useState<{ forms: SavedOrderForm[]; error: string }>(
		() => {
			try {
				return { forms: drafts.read(), error: "" };
			} catch {
				return { forms: [], error: formsReadError };
			}
		},
	);
	const [savedForms, setSavedForms] = useState(initialForms.forms);

	const [formError, setFormError] = useState(initialForms.error);

	const inFlight = useRef(false);

	function newForm() {
		if (inFlight.current) return;
		dispatch({
			type: "start",
			creation: startCreation(crypto.randomUUID(), initialOrderForm(warehouse)),
		});
		setFormError("");
	}
	function openCreation() {
		if (inFlight.current || creation) return;
		try {
			const forms = drafts.read();
			setSavedForms(forms);
			setFormError("");
			if (forms.length) dispatch({ type: "choose" });
			else newForm();
		} catch {
			setFormError(formsReadError);
		}
	}
	function restoreForm(form: SavedOrderForm) {
		dispatch({ type: "start", creation: startCreation(form.id, form.values) });
		setFormError("");
	}
	function changeValues(values: OrderFormValues) {
		if (inFlight.current) return;
		dispatch({ type: "change", values });
	}
	function closeCreation() {
		if (inFlight.current) return;
		const isChanged =
			!!creation && JSON.stringify(creation.values) !== creation.baseline;

		dispatch({ type: isChanged ? "askToClose" : "close" });
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
			dispatch({ type: "close" });
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

		dispatch({ type: "close" });
	}
	async function createDraft(order: OrderInput) {
		if (!creation || inFlight.current) return;
		const formId = creation.id;
		inFlight.current = true;
		dispatch({ type: "submit" });
		try {
			await execute("order", order, { operationId: formId });
			try {
				setSavedForms(drafts.remove(formId));
			} catch {
				setFormError(
					"Заказ создан, но сохранённую форму не удалось удалить. Удалите её перед повторным использованием.",
				);
			}
			dispatch({ type: "submitted", formId });
		} finally {
			inFlight.current = false;
			dispatch({ type: "submitEnded" });
		}
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
		closeChooser: () => dispatch({ type: "closeChooser" }),
		continueForm: () => {
			dispatch({ type: "continue" });
			setFormError("");
		},
		createDraft,
	};
}
