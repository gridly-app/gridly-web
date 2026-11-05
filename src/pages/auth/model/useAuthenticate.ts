import { type SubmitEvent, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useSession } from "@/shared/auth";
import { errorMessage, formText } from "@/shared/lib";

export function useAuthenticate() {
	const { authenticate } = useSession();
	const navigate = useNavigate();
	const [searchParams, setSearchParams] = useSearchParams();
	const register = searchParams.get("mode") === "register";
	const [show, changePasswordVisibility] = useState(false);
	const [error, setError] = useState("");
	const [pending, setPending] = useState(false);
	const submitting = useRef(false);
	const [passwordValue, setPasswordValue] = useState("");
	const [confirmationValue, setConfirmationValue] = useState("");

	async function submit(e: SubmitEvent<HTMLFormElement>) {
		e.preventDefault();
		if (submitting.current) {
			return;
		}
		setError("");
		const data = new FormData(e.currentTarget);

		const password = data.get("password");
		if (register && password !== data.get("passwordConfirmation")) {
			const confirmation = e.currentTarget.elements.namedItem(
				"passwordConfirmation",
			);
			setError("Пароли не совпадают. Повторите пароль ещё раз.");
			if (confirmation instanceof HTMLInputElement) {
				confirmation.setCustomValidity("Пароли не совпадают");
				confirmation.reportValidity();
				confirmation.focus();
			}
			return;
		}
		submitting.current = true;
		setPending(true);
		try {
			await authenticate(register ? "register" : "login", {
				login: formText(data, "login"),
				password: typeof password === "string" ? password : "",
			});
			navigate("/app", { replace: true });
		} catch (e) {
			setError(errorMessage(e));
		} finally {
			submitting.current = false;
			setPending(false);
		}
	}

	function toggleMode() {
		if (submitting.current) return;
		setError("");
		changePasswordVisibility(false);
		setPasswordValue("");
		setConfirmationValue("");
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
	const modePrompt = register ? "Уже есть аккаунт?" : "Нет аккаунта?";
	const modeLabel = register ? "Войти" : "Зарегистрироваться";
	function clearPasswordError(form: HTMLFormElement) {
		const data = new FormData(form);
		setPasswordValue(String(data.get("password") ?? ""));
		setConfirmationValue(String(data.get("passwordConfirmation") ?? ""));
		const confirmation = form.elements.namedItem("passwordConfirmation");
		if (confirmation instanceof HTMLInputElement)
			confirmation.setCustomValidity("");
		setError("");
	}

	return {
		submit,
		register,
		passwordLongEnough: passwordValue.length >= 8,
		passwordMatches:
			confirmationValue.length > 0 && passwordValue === confirmationValue,
		modePrompt,
		clearPasswordError,
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
