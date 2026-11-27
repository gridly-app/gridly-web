import type { Product, ProductInput } from "@/domain/warehouse";
import { formNumber, formText, UserError } from "@/shared/lib";

const volumePattern = /^\d+(\.\d{1,3})?$/;
const pricePattern = /^\d+(\.\d{1,2})?$/;

function isValidVolume(volume: string) {
	const value = Number(volume);

	return volumePattern.test(volume) && Number.isFinite(value) && value > 0;
}

function isValidPrice(price: string) {
	return !price || (pricePattern.test(price) && Number.isFinite(Number(price)));
}

export function productFromForm(
	data: FormData,
	product?: Product | undefined,
): ProductInput {
	const volume = formText(data, "volume");
	const price = formText(data, "price");
	const shelf = formNumber(data, "shelf");

	if (!isValidVolume(volume))
		throw new UserError(
			"Объём: положительное число, максимум 3 знака после точки",
		);
	if (!isValidPrice(price))
		throw new UserError("Цена: максимум 2 знака после точки");
	if (!Number.isSafeInteger(shelf) || shelf < 0) {
		throw new UserError(
			"Срок годности должен быть целым неотрицательным числом",
		);
	}

	return {
		revision: product?.revision,
		id: product?.id,
		name: formText(data, "name"),
		sku: formText(data, "sku"),
		category: formText(data, "category"),
		volume,
		price,
		shelf,
		archived: product?.archived,
	};
}
