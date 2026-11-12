import { useEffect, useState } from "react";

export function useMapView(editorActive: boolean) {
	const [viewing, setViewing] = useState(false);
	const editing = editorActive && viewing;
	useEffect(() => {
		if (!viewing) {
			return;
		}

		function handleEscape(event: KeyboardEvent) {
			if (
				event.key === "Escape" &&
				!editing &&
				!event.defaultPrevented &&
				!(
					event.target instanceof Element &&
					event.target.closest('[role="dialog"], input, textarea, select')
				)
			) {
				setViewing(false);
			}
		}

		window.addEventListener("keydown", handleEscape);

		return () => window.removeEventListener("keydown", handleEscape);
	}, [viewing, editing]);

	return { viewing, setViewing, editing };
}
