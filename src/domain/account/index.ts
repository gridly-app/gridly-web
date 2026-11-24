import { z } from "zod";

export const loginMaxLength = 254;
export const registrationLoginMaxLength = 32;
export const loginSchema = z.string().trim().min(1).max(loginMaxLength);
export const newLoginSchema = loginSchema
	.min(3)
	.regex(
		/^[A-Za-z0-9_.+@-]+$/,
		"Используйте латиницу, цифры и символы _ . + - @ без пробелов.",
	);
