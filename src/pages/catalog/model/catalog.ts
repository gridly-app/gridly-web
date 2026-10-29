import type { Category, Product } from "@/entities/warehouse";

export type CatalogTab = "products" | "categories";

export type CatalogDialogState =
	| { type: "product"; item?: Product | undefined }
	| { type: "category"; item?: Category | undefined };

export interface CatalogProduct extends Product {
	categoryName: string | undefined;
}

export interface CatalogCategory extends Category {
	productCount: number | undefined;
}
