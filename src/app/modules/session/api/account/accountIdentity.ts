import { z } from "zod";

export const accountIdentitySchema = z.object({
	user: z.object({ login: z.string().min(1) }),
});

export function refreshMatchesAccount(data: unknown, login: string) {
	const hasIdentity =
		typeof data === "object" && data !== null && "user" in data;

	if (!hasIdentity) return true;

	const response = accountIdentitySchema.safeParse(data);

	return response.success && response.data.user.login === login;
}
