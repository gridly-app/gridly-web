import { signInPath } from "@/ports/navigation";

export const signInRoute = {
	id: "sign-in",
	path: signInPath,
	access: "public",
	load: () => import("./SignIn").then(({ SignIn }) => ({ default: SignIn })),
} as const;
