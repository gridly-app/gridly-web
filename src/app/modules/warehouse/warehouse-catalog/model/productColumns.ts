import { productPrice } from "@/domain/warehouse";

import type { CatalogProduct } from "./catalog";

export const productColumns = [
	{
		key: "sku",
		label: "Артикул",
		value: (product: CatalogProduct) => product.sku,
	},
	{
		key: "category",
		label: "Категория",
		value: (product: CatalogProduct) => product.categoryName,
	},
	{
		key: "volume",
		label: "Объём единицы",
		value: (product: CatalogProduct) =>
			Number(product.volume.replace(",", ".")),
	},
	{
		key: "occupancy",
		label: "Занято на складе",
		value: (product: CatalogProduct) => product.occupiedVolume,
	},
	{
		key: "quantity",
		label: "Остаток",
		value: (product: CatalogProduct) => product.stockQuantity,
	},
	{
		key: "price",
		label: "Цена",
		value: (product: CatalogProduct) => productPrice(product.price),
	},
	{
		key: "shelf",
		label: "Срок годности",
		value: (product: CatalogProduct) => product.shelf,
	},
] as const;

export type ProductColumn = (typeof productColumns)[number]["key"];

export type ProductSortKey = ProductColumn | "name";

export type ProductSort = { key: ProductSortKey; isDescending: boolean };

const columnUnits: Partial<Record<ProductColumn, string>> = {
	volume: " м³",
	occupancy: " м³",
	quantity: " шт.",
	price: " ₽",
	shelf: " дн.",
};

export function formatProductValue(
	key: ProductColumn,
	value: string | number | null | undefined,
) {
	if (typeof value !== "number") return value ?? "—";
	if (key === "shelf" && !value) return "Без срока";

	const number = value.toLocaleString("ru-RU", { maximumFractionDigits: 3 });

	return `${number}${columnUnits[key] ?? ""}`;
}

function compareValues(
	left: string | number | null | undefined,
	right: string | number | null | undefined,
) {
	if (left == null) return right == null ? 0 : 1;
	if (right == null) return -1;
	if (typeof left === "number" && typeof right === "number")
		return left - right;

	return String(left).localeCompare(String(right), "ru-RU", { numeric: true });
}

export function sortProducts(
	products: readonly CatalogProduct[],
	sort: ProductSort | null,
	columns: ProductColumn[],
) {
	if (!sort) return products;

	const column = productColumns.find(
		(item) => item.key === sort.key && columns.includes(item.key),
	);

	if (sort.key !== "name" && !column) return products;

	const valueOf = (product: CatalogProduct) =>
		column ? column.value(product) : product.name;
	const direction = sort.isDescending ? -1 : 1;

	return [...products].sort((a, b) => {
		const left = valueOf(a);
		const right = valueOf(b);

		if (left == null || right == null) return compareValues(left, right);

		return direction * compareValues(left, right);
	});
}
