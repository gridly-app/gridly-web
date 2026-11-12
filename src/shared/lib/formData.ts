import { UserError } from "./UserError";

export function formText(data: FormData, key: string): string {
	const value = data.get(key);
	if (value !== null && typeof value !== "string")
		throw new UserError("Заполните текстовые поля и попробуйте ещё раз.");
	return (value ?? "").trim();
}

export function formNumber(data: FormData, key: string): number {
	return Number(formText(data, key));
}
