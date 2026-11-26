import { useLayoutEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { sandboxEntryPath } from "@/ports/navigation";
import { useSandboxAccess } from "@/ports/session";
import { errorMessage } from "@/shared/lib";

export function useLandingSandbox() {
	const { controller } = useSandboxAccess();
	const navigate = useNavigate();
	const launch = useRef<AbortController | null>(null);
	const [isPending, setIsPending] = useState(false);
	const [error, setError] = useState("");

	useLayoutEffect(() => {
		return () => launch.current?.abort();
	}, []);

	async function handleOpenSandbox() {
		if (launch.current) return;

		const request = new AbortController();

		launch.current = request;
		setIsPending(true);
		setError("");

		try {
			await controller.start();

			if (request.signal.aborted) return;

			const snapshot = controller.getSnapshot();

			if (snapshot.status !== "active") {
				setError(snapshot.error);

				return;
			}

			await navigate(sandboxEntryPath);
		} catch (error) {
			if (!request.signal.aborted) setError(errorMessage(error));
		} finally {
			launch.current = null;

			if (!request.signal.aborted) setIsPending(false);
		}
	}

	return { handleOpenSandbox, isPending, error };
}
