import type { CellType } from "@/entities/warehouse";
import { cellColors } from "@/entities/warehouse";

export const mapThemes = {
	light: {
		cells: cellColors,
		wallBorder: "#345642",
		perimeter: "#7b8e83",
		coordinates: "#435f4d",
		storageMark: "#276440",
		symbol: "#294b37",
		selection: "#a33f1b",
	},
	dark: {
		cells: {
			empty: "#101814",
			aisle: "#203128",
			storage: "#285c3f",
			cold: "#285c3f",
			unload: "#825537",
			load: "#65516d",
			charge: "#355743",
			wall: "#71717a",
		} satisfies Record<CellType, string>,
		wallBorder: "#a1a1aa",
		perimeter: "#71717a",
		coordinates: "#a1a1aa",
		storageMark: "#c3efd2",
		symbol: "#fafafa",
		selection: "#fafafa",
	},
};
