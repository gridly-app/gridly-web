import type { QueryClient } from "@tanstack/react-query";

import {
	mergeRobotPositions,
	type Warehouse,
	type WarehouseCommand,
	type WarehouseLiveState,
} from "@/domain/warehouse";
import type { HttpClient, RequestOptions } from "@/shared/http";

import type { WarehouseKeys } from "../../model/queries/queryKeys";
import { RestWarehouseCommands } from "../commands/restCommands";
import type { WarehouseMutationRequests } from "./warehouseMutationRequests";

type MarkSent = (retry?: () => Promise<unknown>) => void;

type ExecuteWarehouseCommandOptions = {
	http: HttpClient;
	mutations: Pick<WarehouseMutationRequests, "send">;
	cache: QueryClient;
	keys: WarehouseKeys;
	id: string;
	input: WarehouseCommand;
	warehouse: Warehouse;
	operationId: string | undefined;
	session: AbortSignal;
	markSent?: MarkSent | undefined;
};

export async function executeWarehouseCommand({
	http,
	mutations,
	cache,
	keys,
	id,
	input,
	warehouse,
	operationId,
	session,
	markSent,
}: ExecuteWarehouseCommandOptions) {
	function sendMutation(
		path: string,
		request: RequestOptions,
		keyed?: boolean,
	) {
		const method = request.method ?? "POST";
		const idempotencyKey =
			operationId === undefined
				? undefined
				: `${operationId}:${method}:${path}`;
		const options = { ...request, idempotencyKey, signal: session };
		const isLayoutCommit =
			input.action === "saveMap" && path.endsWith("/layout/commit");

		if (!isLayoutCommit) {
			markSent?.();

			return mutations.send(path, options, keyed);
		}

		const commitKey = idempotencyKey ?? crypto.randomUUID();
		const commitOptions = {
			...options,
			idempotencyKey: commitKey,
			body: structuredClone(request.body),
		};
		const sendCommit = () => mutations.send(path, commitOptions, keyed);

		markSent?.(sendCommit);

		return sendCommit();
	}

	const robots = cache.getQueryData(keys.resource(id, "robots"));
	const live = cache.getQueryData<WarehouseLiveState>(keys.live(id));
	const currentRobots =
		robots && live?.layoutVersion === warehouse.version
			? { robots: mergeRobotPositions(robots.robots, live.robots) }
			: robots;
	const commands = new RestWarehouseCommands(http, sendMutation);
	const settings = await commands.execute(id, input, warehouse, {
		map: cache.getQueryData(keys.resource(id, "map")),
		catalog: cache.getQueryData(keys.resource(id, "catalog")),
		inventory: cache.getQueryData(keys.resource(id, "inventory")),
		orders: cache.getQueryData(keys.resource(id, "orders")),
		robots: currentRobots,
	});

	session.throwIfAborted();

	if (!settings) return;

	cache.setQueryData(keys.resource(id, "settings"), (current) =>
		current && current.settings.revision > settings.revision
			? current
			: { settings },
	);
}
