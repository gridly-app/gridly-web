import type { CellType, WorkflowPolicy } from "@/domain/warehouse";
import type { PolicyDto } from "../warehouses/warehouseDto";

export const wireKinds = {
	empty: "empty",
	aisle: "aisle",
	storage: "storage_general",
	cold: "storage_cold",
	unload: "receiving",
	load: "shipping",
	charge: "charging",
	wall: "wall",
} as const satisfies Record<CellType, string>;

export function policyToDto(values: WorkflowPolicy): PolicyDto {
	return {
		confirm_unload: values.confirmUnload,
		confirm_pick: values.confirmPick,
		confirm_putaway: values.confirmPutaway,
		confirm_load: values.confirmLoad,
	};
}

export function policyFromDto(p: {
	[K in keyof PolicyDto]?: PolicyDto[K] | undefined;
}) {
	return {
		confirmUnload: !!p.confirm_unload,
		confirmPick: !!p.confirm_pick,
		confirmPutaway: !!p.confirm_putaway,
		confirmLoad: !!p.confirm_load,
	};
}
