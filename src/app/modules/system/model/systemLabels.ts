const componentNames = new Map([
	["api", "Сервис отгрузок"],
	["warehouse", "Складской сервис"],
]);

export function componentName(code: string) {
	return componentNames.get(code) ?? code;
}
