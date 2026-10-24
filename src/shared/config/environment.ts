const mockApi =
	import.meta.env.DEV && import.meta.env.VITE_USE_MOCKS === "true";

export const environment = {
	mockApi,
	get demoActive() {
		return globalThis.sessionStorage?.getItem("gridly.demo") === "true";
	},
	get sandboxMode() {
		return mockApi || this.demoActive;
	},
	apiBaseUrl:
		typeof import.meta.env.VITE_API_BASE_URL === "string" &&
		import.meta.env.VITE_API_BASE_URL
			? import.meta.env.VITE_API_BASE_URL
			: "/api/v1",
};
