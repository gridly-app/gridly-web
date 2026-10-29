import type { WarehouseCommand } from "../../model/commands/commands";
import type { RestCommandContext } from "./context";
import { requireRevision } from "./context";
import { serializeLayoutCells } from "./layoutCells";

export async function saveMap(
	context: RestCommandContext,
	command: Extract<WarehouseCommand, { action: "saveMap" }>,
) {
	if (!context.warehouse.allowedActions?.includes("save-map"))
		throw new Error(
			"Сохранение карты недоступно: сервер не предоставил разрешение save-map",
		);
	const draft = command.value;
	const categoryIds = new Set(context.warehouse.categories.map((c) => c.id));
	const zoneIds = new Set(
		context.warehouse.cells.flatMap((c) => (c.zone ? [c.zone.id] : [])),
	);
	await context.send("/layout/commit", {
		base_version: draft.baseVersion,
		draft_revision: draft.draftRevision,
		categories: draft.categories?.map((c) => ({
			...(categoryIds.has(c.id) ? { id: c.id } : { client_id: c.id }),
			name: c.name,
			storage_kind: c.cold ? "cold" : "general",
			revision: c.revision,
		})),
		cells: serializeLayoutCells(draft.cells, zoneIds),
		routes: draft.routes,
	});
}

export async function discardLayout(
	context: RestCommandContext,
	_command: Extract<WarehouseCommand, { action: "discard" }>,
): Promise<void> {
	const { warehouse, base, mutate } = context;

	await mutate(`${base}/layout/draft`, {
		method: "DELETE",
		headers: { "If-Match": `"${requireRevision(warehouse.draftRevision)}"` },
	});
}
