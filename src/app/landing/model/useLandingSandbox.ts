import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSandboxAccess } from "@/ports/session";
import { errorMessage } from "@/shared/lib";

export function useLandingSandbox() {
	const { controller } = useSandboxAccess();
	const navigate = useNavigate();
	const [pending, setPending] = useState(false);
	const [error, setError] = useState("");
	async function openSandbox() {
		if (pending) return;
		setPending(true);
		setError("");
		try {
			await controller.start();
			const snapshot = controller.getSnapshot();
			if (snapshot.status === "error") {
				setError(snapshot.error);
				return;
			}
			void navigate("/sandbox");
		} catch (error) {
			setError(errorMessage(error));
		} finally {
			setPending(false);
		}
	}
	return { openSandbox, pending, error };
}
