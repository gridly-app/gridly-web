import { z } from "zod";

export const revision = z.number().int().nonnegative().optional();
export const identity = { id: z.string(), revision };

export const counter = z.union([
	z.string().regex(/^\d+$/),
	z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
]);

export const decimal = z.union([
	z.string().regex(/^-?\d+(?:\.\d+)?$/),
	z.number(),
]);
