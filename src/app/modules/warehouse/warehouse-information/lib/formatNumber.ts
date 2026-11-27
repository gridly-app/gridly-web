const numberFormat = new Intl.NumberFormat("ru-RU");
const moneyFormat = new Intl.NumberFormat("ru-RU", {
	style: "currency",
	currency: "RUB",
	maximumFractionDigits: 2,
});

export function formatNumber(value: number) {
	return numberFormat.format(value);
}

export function formatMoney(value: number) {
	return moneyFormat.format(value);
}
