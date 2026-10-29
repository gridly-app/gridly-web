import { type SubmitEvent, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useDemoSession, useSession } from "@/shared/auth";
import { warehousePath } from "@/shared/config";
import { errorMessage, formText } from "@/shared/lib";

export function useAuthenticate() {
	const { authenticate } = useSession();
	const { controller } = useDemoSession();
	const navigate = useNavigate();
	const [searchParams, setSearchParams] = useSearchParams();
	const register = searchParams.get("mode") === "register";
	const [show, changePasswordVisibility] = useState(false);
	const [error, setError] = useState("");
	const [pending, setPending] = useState(false);
	const [demoPending, setDemoPending] = useState(false);

	async function submit(e: SubmitEvent<HTMLFormElement>) {
		e.preventDefault();
		if (pending || demoPending) {
			return;
		}
		setPending(true);
		setError("");
		const data = new FormData(e.currentTarget);

		const password = data.get("password");
		try {
			await authenticate(register ? "register" : "login", {
				login: formText(data, "login"),
				password: typeof password === "string" ? password : "",
			});
			navigate("/app", { replace: true });
		} catch (e) {
			setError(errorMessage(e));
		} finally {
			setPending(false);
		}
	}

	async function openDemo() {
		if (pending || demoPending) {
			return;
		}
		setDemoPending(true);
		setError("");
		try {
			if (controller.getSnapshot().session) await controller.restore();
			else await controller.start();
			const current = controller.getSnapshot();
			if (current.status === "error") throw new Error(current.error);
			navigate(
				current.status === "active" && current.session
					? warehousePath(
							"demo",
							current.session.last_warehouse_id ||
								current.session.initial_warehouse_id,
						)
					: "/demo",
			);
		} catch (error) {
			setError(errorMessage(error));
		} finally {
			setDemoPending(false);
		}
	}

	function toggleMode() {
		if (pending || demoPending) return;
		setError("");
		setSearchParams((current) => {
			const next = new URLSearchParams(current);
			if (next.get("mode") === "register") {
				next.delete("mode");
			} else {
				next.set("mode", "register");
			}
			return next;
		});
	}

	const title = register ? "Создать аккаунт" : "Войти в пространство";
	const description = register
		? "Создайте своё рабочее пространство."
		: "Войдите, чтобы продолжить.";
	const passwordType = show ? "text" : "password";
	const passwordAutoComplete = register ? "new-password" : "current-password";
	const submitLabel = pending
		? "Подождите…"
		: register
			? "Зарегистрироваться"
			: "Войти";
	const modeLabel = register
		? "Уже есть аккаунт? Войти"
		: "Нет аккаунта? Зарегистрироваться";

	return {
		submit,
		openDemo,
		demoPending,
		show,
		error,
		pending,
		changePasswordVisibility,
		toggleMode,
		title,
		description,
		passwordType,
		passwordAutoComplete,
		submitLabel,
		modeLabel,
	};
}
