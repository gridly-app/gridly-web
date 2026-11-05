import type { incomingProduct, Stock } from "@/entities/warehouse";

export type ProductReplenishment = Omit<
	ReturnType<typeof incomingProduct>,
	"deliveries"
> & {
	deliveries: (ReturnType<typeof incomingProduct>["deliveries"][number] & {
		label: string;
	})[];
};

export interface InventoryStock extends Stock {
	productName: string | undefined;
	zoneName: string;
	incoming: ProductReplenishment;
}
