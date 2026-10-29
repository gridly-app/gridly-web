import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDemoSession } from "@/shared/auth";
import { warehousePath } from "@/shared/config";
import { errorMessage } from "@/shared/lib";

export function useLandingDemo() {
	const { controller } = useDemoSession();
	const navigate = useNavigate();
	const [pending, setPending] = useState(false);
	const [error, setError] = useState("");
	async function openDemo() {
		if (pending) return;
		setPending(true);
		setError("");
		try {
			if (controller.getSnapshot().session) await controller.restore();
			else await controller.start();
			const snapshot = controller.getSnapshot();
			if (snapshot.status === "error") throw new Error(snapshot.error);
			void navigate(
				snapshot.status === "active" && snapshot.session
					? warehousePath(
							"demo",
							snapshot.session.last_warehouse_id ||
								snapshot.session.initial_warehouse_id,
						)
					: "/demo",
			);
		} catch (error) {
			setError(errorMessage(error));
		} finally {
			setPending(false);
		}
	}
	return { openDemo, pending, error };
}
