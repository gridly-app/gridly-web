import { useEffect, useState } from "react";

export function useWorkspaceNotice() {
	const [message, show] = useState("");
	useEffect(() => {
		if (!message) return;
		const timer = setTimeout(() => show(""), 5000);
		return () => clearTimeout(timer);
	}, [message]);

	function dismiss() {
		show("");
	}

	return { message, show, dismiss };
}
