import {
	loginMaxLength,
	newLoginMinLength,
	newLoginSchema,
	passwordMinLength,
	registrationLoginMaxLength,
} from "@/domain/account";
import type { AuthMode } from "@/ports/session";
import { formText } from "@/shared/lib";

export function credentialsFormRules(mode: AuthMode, isExtendedLogin: boolean) {
	const isRegistration = mode === "register";

	return {
		loginMinLength: isRegistration ? newLoginMinLength : 1,
		loginMaxLength:
			isRegistration && !isExtendedLogin
				? registrationLoginMaxLength
				: loginMaxLength,
		registration: isRegistration
			? { passwordMinLength, isExtendedLogin }
			: null,
	};
}

export type CredentialsFormRules = ReturnType<typeof credentialsFormRules>;

export function readCredentials(data: FormData, rules: CredentialsFormRules) {
	const password = data.get("password");

	if (rules.registration && password !== data.get("passwordConfirmation"))
		return {
			ok: false,
			field: "passwordConfirmation",
			message: "Пароли не совпадают. Повторите пароль ещё раз.",
		} as const;

	const login = formText(data, "login");

	if (
		rules.registration?.isExtendedLogin &&
		!newLoginSchema.safeParse(login).success
	)
		return {
			ok: false,
			field: "login",
			message: `Логин должен содержать от ${newLoginMinLength} до ${loginMaxLength} символов. Используйте латиницу, цифры и символы _ . + - @.`,
		} as const;

	return {
		ok: true,
		credentials: {
			login,
			password: typeof password === "string" ? password : "",
		},
	} as const;
}
