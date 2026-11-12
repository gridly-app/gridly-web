import { useEffect, useState } from "react";
import { toastManager } from "@/shared/ui/feedback";

export function useWorkspaceNotice() {
	const [message, show] = useState("");

	useEffect(() => {
		if (!message) return;
		let active = true;
		const dismiss = () => show("");
		const timer = setTimeout(dismiss, 5000);
		const id = toastManager.add({
			description: message,
			timeout: 6000,
			onClose: () => {
				if (active) dismiss();
			},
		});

		return () => {
			active = false;
			clearTimeout(timer);
			toastManager.close(id);
		};
	}, [message]);

	return show;
}
