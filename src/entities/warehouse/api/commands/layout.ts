import { parseResponse } from "@/shared/api";
import type { WarehouseCommand } from "../../model/commands/commands";
import { revisionDto, validationDto } from "../contracts/contract";
import { wireKinds } from "../contracts/contractMappers";
import type { RestCommandContext } from "./context";
import { requireRevision } from "./context";

export async function saveLayout(
	context: RestCommandContext,
	command: Extract<WarehouseCommand, { action: "draft" | "publish" }>,
): Promise<void> {
	const { warehouse, base, http, mutate, send } = context;
	let draft = warehouse.draft
		? { revision: warehouse.draftRevision }
		: parseResponse(
				revisionDto,
				await mutate(`${base}/layout/draft`, {
					method: "POST",
					body: {},
				}),
			);
	const changed = command.value.filter((cell) => {
		const old = warehouse.draft?.find((n) => n.x === cell.x && n.y === cell.y);

		return !old || old.type !== cell.type || old.capacity !== cell.capacity;
	});

	for (let i = 0; i < changed.length; i += 1000) {
		draft = parseResponse(
			revisionDto,
			await mutate(`${base}/layout/draft/cells`, {
				method: "PUT",
				body: {
					revision: requireRevision(draft.revision),
					cells: changed.slice(i, i + 1000).map((cell) => ({
						x: cell.x,
						y: cell.y,
						kind: wireKinds[cell.type],
						code: null,
						capacity_volume: cell.capacity,
					})),
				},
			}),
		);
	}
	if (command.action === "publish") {
		const check = parseResponse(
			validationDto,
			await http.request(`${base}/layout/draft/validate`, {
				method: "POST",
				body: {},
			}),
		);

		if (!check.valid) {
			throw new Error(check.issues.map((i) => i.message).join("; "));
		}
		await send("/layout/draft/publish", {
			revision: requireRevision(draft.revision),
		});
	}
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
