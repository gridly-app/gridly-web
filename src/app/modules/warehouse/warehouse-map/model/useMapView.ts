import { useEffect, useState } from "react";

function isTypingTarget(target: EventTarget | null) {
	return (
		target instanceof Element &&
		Boolean(target.closest('[role="dialog"], input, textarea, select'))
	);
}

export function useMapView(editorActive: boolean, startInEditor: boolean) {
	const [viewing, setViewing] = useState(startInEditor);
	const editing = editorActive && viewing;

	useEffect(() => {
		if (!viewing) return;

		function handleEscape(event: KeyboardEvent) {
			const canClose =
				!editing && !event.defaultPrevented && !isTypingTarget(event.target);

			if (event.key === "Escape" && canClose) setViewing(false);
		}

		window.addEventListener("keydown", handleEscape);

		return () => window.removeEventListener("keydown", handleEscape);
	}, [viewing, editing]);

	return { viewing, setViewing, editing };
}
