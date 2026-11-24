import { useEffect } from "react";

import { useNavigationConfirmation } from "@/ports/navigation";

export function useUnsavedLayoutWarning(hasUnsubmittedChanges: boolean) {
	useNavigationConfirmation((currentPath, nextPath) => {
		if (!hasUnsubmittedChanges || currentPath === nextPath) return;
		if (
			currentPath.startsWith("/sandbox/") &&
			!nextPath.startsWith("/sandbox/")
		)
			return;

		return {
			title: "Покинуть карту?",
			description: "Несохранённые изменения планировки будут потеряны.",
			cancelLabel: "Остаться",
			confirmLabel: "Покинуть карту",
		};
	});
	useEffect(() => {
		if (!hasUnsubmittedChanges) return;

		function preventUnload(event: BeforeUnloadEvent) {
			event.preventDefault();
			event.returnValue = "";
		}

		window.addEventListener("beforeunload", preventUnload);

		return () => window.removeEventListener("beforeunload", preventUnload);
	}, [hasUnsubmittedChanges]);
}
