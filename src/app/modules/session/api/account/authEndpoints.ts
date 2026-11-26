import type { AuthEndpoints } from "@/shared/http";

export const accountAuthEndpoints = {
	prefix: "/auth/",
	login: "/auth/login",
	refresh: "/auth/refresh",
} as const satisfies AuthEndpoints;

export const accountRegistrationPath = "/auth/register";

export const accountLogoutPath = "/auth/logout";
