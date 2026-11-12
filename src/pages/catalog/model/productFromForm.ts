import type { Product, ProductInput } from "@/entities/warehouse";
import { formNumber, formText, UserError } from "@/shared/lib";

export function productFromForm(
	data: FormData,
	product?: Product | undefined,
): ProductInput {
	const volume = formText(data, "volume");
	const price = formText(data, "price");
	const shelf = formNumber(data, "shelf");

	if (
		!/^\d+(\.\d{1,3})?$/.test(volume) ||
		!Number.isFinite(Number(volume)) ||
		Number(volume) <= 0
	) {
		throw new UserError(
			"Объём: положительное число, максимум 3 знака после точки",
		);
	}
	if (
		price &&
		(!/^\d+(\.\d{1,2})?$/.test(price) || !Number.isFinite(Number(price)))
	) {
		throw new UserError("Цена: максимум 2 знака после точки");
	}
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
