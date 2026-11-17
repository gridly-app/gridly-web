export const environment = {
	adminGuestLinkReplay: import.meta.env?.VITE_ADMIN_GUEST_LINK_REPLAY === "true",
	apiBaseUrl:
		typeof import.meta.env?.VITE_API_BASE_URL === "string" &&
		import.meta.env?.VITE_API_BASE_URL
			? import.meta.env?.VITE_API_BASE_URL
			: "/api/v1",
};
