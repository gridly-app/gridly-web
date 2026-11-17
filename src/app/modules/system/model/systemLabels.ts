const componentNames = new Map([
	["api", "Сервис отгрузок"],
	["warehouse", "Складской сервис"],
]);

export const componentName = (code: string) =>
	componentNames.get(code) ?? "Компонент системы";
