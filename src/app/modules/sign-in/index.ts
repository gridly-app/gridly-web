export const signInRoute = {
	id: "sign-in",
	path: "/auth",
	access: "public",
	load: () => import("./SignIn").then(({ SignIn }) => ({ default: SignIn })),
} as const;
