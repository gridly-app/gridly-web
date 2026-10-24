import { type FormEvent, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useSession } from "@/shared/auth";
import { errorMessage, formText } from "@/shared/lib";

export function useAuthenticate() {
	const { authenticate, enterDemo } = useSession();
	const navigate = useNavigate();
	const [searchParams] = useSearchParams();
	const [register, setRegister] = useState(
		() => searchParams.get("mode") === "register",
	);
	const [show, changePasswordVisibility] = useState(false);
	const [error, setError] = useState("");
	const [pending, setPending] = useState(false);
	const [demoPending, setDemoPending] = useState(false);

	async function submit(e: FormEvent<HTMLFormElement>) {
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
			await navigate("/", { replace: true });
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
			await enterDemo();
			await navigate("/", { replace: true });
		} catch (error) {
			setError(errorMessage(error));
		} finally {
			setDemoPending(false);
		}
	}

	function toggleMode() {
		setRegister((value) => !value);
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
