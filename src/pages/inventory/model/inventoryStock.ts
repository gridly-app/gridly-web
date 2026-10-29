import type { Stock } from "@/entities/warehouse";

export interface InventoryStock extends Stock {
	productName: string | undefined;
	zoneName: string;
}
