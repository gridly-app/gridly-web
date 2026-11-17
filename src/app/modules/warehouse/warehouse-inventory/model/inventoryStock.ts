import type { Stock } from "@/domain/warehouse";

export interface InventoryStock extends Stock {
	productName: string | undefined;
	zoneKey: string;
	zoneName: string;
}
