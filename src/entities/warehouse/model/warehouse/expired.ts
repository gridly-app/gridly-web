export const expired = (
	date: string,
	today = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Moscow" }),
) => !!date && date < today;
