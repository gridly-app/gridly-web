export type EditorMode = "construction" | "routes";

export type EditorOperation = "idle" | "saving" | "optimizing" | "discarding";

export type EditorState =
	| { view: "viewing"; mode: EditorMode; operation: "idle" }
	| { view: "editing"; mode: EditorMode; operation: EditorOperation };

export type EditorEvent =
	| { type: "open"; mode: EditorState["mode"] }
	| { type: "close" }
	| { type: "operation"; operation: EditorState["operation"] };

export const initialEditorState: EditorState = {
	view: "viewing",
	mode: "construction",
	operation: "idle",
};

export function editorReducer(
	state: EditorState,
	event: EditorEvent,
): EditorState {
	if (event.type === "operation")
		return state.view === "editing"
			? { ...state, operation: event.operation }
			: state;
	if (state.operation !== "idle") return state;
	return event.type === "open"
		? { ...state, view: "editing", mode: event.mode }
		: { ...state, view: "viewing", operation: "idle" };
}
