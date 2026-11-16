export const landingRoute = {
	id: "landing",
	path: "/",
	access: "public",
	load: () =>
		import("./Landing").then(({ Landing }) => ({
			default: Landing,
		})),
} as const;
