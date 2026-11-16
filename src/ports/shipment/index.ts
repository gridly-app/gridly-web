import type { ComponentType } from "react";
import type { Shipment } from "@/domain/shipment";

export type ShipmentProgressSlot = ComponentType<{
	shipment: Pick<Shipment, "order" | "milestones">;
	kind?: "inbound" | "outbound";
	title?: string;
}>;
