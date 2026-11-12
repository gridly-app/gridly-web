import type { Cell } from "../../model/warehouse";
import { wireKinds } from "../contracts/contractMappers";

export function serializeLayoutCells(
	cells: Cell[],
	existingZoneIds: Set<string>,
) {
	return cells.map((cell) => ({
		x: cell.x,
		y: cell.y,
		kind: wireKinds[cell.type],
		capacity_volume: cell.capacity,
		zone: cell.zone
			? {
					...(existingZoneIds.has(cell.zone.id)
						? { id: cell.zone.id }
						: { client_id: cell.zone.id }),
					name: cell.zone.name,
					category_id: cell.zone.categoryId,
				}
			: null,
	}));
}
