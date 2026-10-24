export const errorMessage = (error: unknown) =>
	error instanceof Error ? error.message : "Не удалось выполнить действие";
