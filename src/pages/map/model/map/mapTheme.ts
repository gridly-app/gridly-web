import type { CellType } from "@/entities/warehouse";
import { cellColors } from "@/entities/warehouse";

export const mapThemes = {
	light: {
		cells: cellColors,
		wallBorder: "#5e6b4e",
		perimeter: "#a7af9a",
		coordinates: "#737f68",
		storageMark: "#7b905d",
		coldMark: "#4d9181",
		symbol: "#5b6851",
		selection: "#e86536",
	},
	dark: {
		cells: {
			empty: "#111113",
			aisle: "#242426",
			storage: "#4e6338",
			cold: "#32675b",
			unload: "#825537",
			load: "#65516d",
			charge: "#4e6a36",
			wall: "#71717a",
		} satisfies Record<CellType, string>,
		wallBorder: "#a1a1aa",
		perimeter: "#71717a",
		coordinates: "#a1a1aa",
		storageMark: "#cfdfb7",
		coldMark: "#9ed8c8",
		symbol: "#fafafa",
		selection: "#fafafa",
	},
};
