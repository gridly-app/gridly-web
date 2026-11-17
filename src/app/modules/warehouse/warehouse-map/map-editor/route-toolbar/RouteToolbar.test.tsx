import { afterEach, beforeEach, expect, mock, test } from "bun:test";
import { act } from "react";
import { WarmTooltipGroup } from "@/shared/ui/overlays";
import { mountDom } from "../../../../../../../tests/support/dom";
import { RouteToolbar, type RouteToolbarProps } from "./index";

let dom: ReturnType<typeof mountDom>;

beforeEach(() => {
	dom = mountDom();
});

afterEach(() => dom.close());

function button(label: string): HTMLButtonElement {
	const element = [...document.querySelectorAll("button")].find(
		(candidate) => candidate.textContent === label,
	);
	if (!element) throw new Error(`Button is missing: ${label}`);

	return element;
}

function renderToolbar({ model, editor, pending }: RouteToolbarProps) {
	act(() => {
		dom.root.render(
			<WarmTooltipGroup>
				<RouteToolbar model={model} editor={editor} pending={pending} />
			</WarmTooltipGroup>,
		);
	});
}

function toolbarProps(): RouteToolbarProps {
	return {
		model: {
			canRedo: false,
			canUndo: false,
			direction: "inbound",
			error: "",
			redo: mock(),
			save: mock(() => Promise.resolve()),
			selectDirection: mock(),
			undo: mock(),
		},
		editor: {
			busy: false,
			canSave: true,
			discard: mock(),
			errors: null,
			saveUnavailableReason: undefined,
		},
		pending: false,
	};
}

test("route toolbar shows the selected direction and forwards a direction change", () => {
	const props = toolbarProps();

	renderToolbar(props);
	expect(button("Загрузка склада").getAttribute("aria-pressed")).toBe("true");

	act(() => button("Отгрузка со склада").click());
	expect(props.model.selectDirection).toHaveBeenCalledWith("outbound");
});

test("route toolbar keeps the error visible and blocks another save while pending", () => {
	const props = toolbarProps();
	props.pending = true;
	props.editor.errors = ["Исходная версия изменилась"];

	renderToolbar(props);
	act(() => button("Сохранить изменения").click());

	expect(props.model.save).not.toHaveBeenCalled();
	expect(document.body.textContent).toContain("Исходная версия изменилась");
});
