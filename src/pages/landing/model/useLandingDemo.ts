import { useState } from "react";
import { useSession } from "@/shared/auth";
import { errorMessage } from "@/shared/lib";

export function useLandingDemo() {
	const { enterDemo } = useSession();
	const [pending, setPending] = useState(false);
	const [error, setError] = useState("");

	async function openDemo() {
		if (pending) {
			return;
		}
		setPending(true);
		setError("");
		try {
			await enterDemo();
		} catch (error) {
			setError(errorMessage(error));
		} finally {
			setPending(false);
		}
	}

	return { openDemo, pending, error };
}
