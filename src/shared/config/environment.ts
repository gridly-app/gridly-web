export const environment = {
	apiBaseUrl:
		typeof import.meta.env.VITE_API_BASE_URL === "string" &&
		import.meta.env.VITE_API_BASE_URL
			? import.meta.env.VITE_API_BASE_URL
			: "/api/v1",
};
