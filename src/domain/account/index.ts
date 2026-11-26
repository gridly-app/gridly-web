import { z } from "zod";

export const loginMaxLength = 254;
export const registrationLoginMaxLength = 32;
export const newLoginMinLength = 3;
export const passwordMinLength = 8;
export const loginSchema = z.string().trim().min(1).max(loginMaxLength);
export const newLoginSchema = loginSchema
	.min(newLoginMinLength)
	.regex(
		/^[A-Za-z0-9_.+@-]+$/,
		"Используйте латиницу, цифры и символы _ . + - @ без пробелов.",
	);
