import { useEffect, useRef } from "react";
import { toastManager } from "@/shared/ui/feedback";

export function useWorkspaceNotice() {
	const notice = useRef<string | null>(null);
	const mounted = useRef(false);

	useEffect(() => {
		mounted.current = true;
		return () => {
			mounted.current = false;
			if (notice.current) toastManager.close(notice.current);
			notice.current = null;
		};
	}, []);

	return (description: string) => {
		if (!mounted.current) return;
		if (notice.current) toastManager.close(notice.current);
		notice.current = toastManager.add({ description, timeout: 5000 });
	};
}
