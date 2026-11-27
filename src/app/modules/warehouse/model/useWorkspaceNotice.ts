import { useEffect, useRef } from "react";

import { toastManager } from "@/shared/ui/feedback";

const NOTICE_TIMEOUT_MS = 5000;

export function useWorkspaceNotice() {
	const noticeId = useRef<string | null>(null);
	const isMounted = useRef(false);

	useEffect(() => {
		isMounted.current = true;

		return () => {
			isMounted.current = false;

			if (noticeId.current) toastManager.close(noticeId.current);

			noticeId.current = null;
		};
	}, []);

	return (description: string) => {
		if (!isMounted.current) return;
		if (noticeId.current) toastManager.close(noticeId.current);

		noticeId.current = toastManager.add({
			description,
			timeout: NOTICE_TIMEOUT_MS,
		});
	};
}
