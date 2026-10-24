import type { CellType } from "../../model/warehouse/schemas";
import type { PolicyDto } from "./contract";

export const wireKinds: Record<CellType, string> = {
	empty: "empty",
	aisle: "aisle",
	storage: "storage_general",
	cold: "storage_cold",
	unload: "receiving",
	load: "shipping",
	charge: "charging",
	wall: "wall",
};

export function policyToDto(values: boolean[]): PolicyDto {
	return {
		confirm_unload: values[0],
		confirm_pick: values[1],
		confirm_putaway: values[2],
		confirm_load: values[3],
	};
}

export function policyFromDto(p: Partial<PolicyDto>) {
	return [
		!!p.confirm_unload,
		!!p.confirm_pick,
		!!p.confirm_putaway,
		!!p.confirm_load,
	];
}
