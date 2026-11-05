import { productPrice } from "@/entities/warehouse";
import type { CatalogProduct } from "./catalog";

export const productColumns = [
	{ key: "sku", label: "Артикул", value: (p: CatalogProduct) => p.sku },
	{
		key: "category",
		label: "Категория",
		value: (p: CatalogProduct) => p.categoryName,
	},
	{
		key: "volume",
		label: "Объём единицы",
		value: (p: CatalogProduct) => Number(p.volume.replace(",", ".")),
	},
	{
		key: "occupancy",
		label: "Занято на складе",
		value: (p: CatalogProduct) => p.occupiedVolume,
	},
	{
		key: "quantity",
		label: "Остаток",
		value: (p: CatalogProduct) => p.stockQuantity,
	},
	{
		key: "price",
		label: "Цена",
		value: (p: CatalogProduct) => productPrice(p.price),
	},
	{
		key: "shelf",
		label: "Срок годности",
		value: (p: CatalogProduct) => p.shelf,
	},
] as const;

export type ProductColumn = (typeof productColumns)[number]["key"];
