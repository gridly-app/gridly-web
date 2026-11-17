import type { QueryClient } from "@tanstack/react-query";
import {
	blocksLayoutWrite,
	type LayoutCommand,
	type LayoutOperation,
} from "@/ports/warehouse";
import { ApiError } from "@/shared/http";
import { UserError } from "@/shared/invariants";
import {
	layoutOperationNamespace,
	type WarehouseKeys,
} from "../queries/queryKeys";

import { layoutIssues } from "./layoutIssues";

function rejectedStatus(
	error: unknown,
	sent: boolean,
): LayoutOperation["status"] {
	if (
		error instanceof ApiError &&
		(error.status === 409 || error.status === 412)
	)
		return "conflict";
	if (!sent || error instanceof UserError) return "rejected";
	if (
		error instanceof ApiError &&
		([400, 401, 403, 404, 405, 422].includes(error.status) ||
			error.code === "STATIC_MOCK")
	) {
		return "rejected";
	}

	return "unknown";
}

export class LayoutResource {
	constructor(
		private readonly cache: QueryClient,
		private readonly getSessionSignal: () => AbortSignal,
		private readonly getKeys: () => WarehouseKeys,
		private readonly read: (id: string, signal: AbortSignal) => Promise<void>,
	) {
		cache.setQueryDefaults([layoutOperationNamespace], {
			gcTime: Infinity,
		});
	}

	private getOperation(id: string) {
		return (
			this.cache.getQueryData<LayoutOperation | null>(
				this.getKeys().layoutOperation(id),
			) ?? null
		);
	}

	private setOperation(id: string, operation: LayoutOperation | null) {
		this.cache.setQueryData(this.getKeys().layoutOperation(id), operation);
	}

	async execute(
		id: string,
		input: LayoutCommand,
		write: (command: LayoutCommand, markSent: () => void) => Promise<void>,
	) {
		if (blocksLayoutWrite(this.getOperation(id))) {
			throw new UserError(
				"Предыдущая операция с планировкой ещё не завершена.",
			);
		}

		const signal = this.getSessionSignal();
		const command = structuredClone(input);
		let sent = false;

		this.setOperation(id, { command, status: "sending" });

		try {
			await write(command, () => {
				sent = true;
			});
			signal.throwIfAborted();
		} catch (error) {
			if (!signal.aborted) {
				const status = rejectedStatus(error, sent);
				const issues = layoutIssues(error);
				this.setOperation(
					id,
					issues.length ? { command, status, issues } : { command, status },
				);

				if (status === "conflict") {
					await this.read(id, signal).catch(() => undefined);
				}
			}

			throw error;
		}

		await this.refreshConfirmed(id, command, signal);
	}

	private async refreshConfirmed(
		id: string,
		command: LayoutCommand,
		signal: AbortSignal,
	) {
		this.setOperation(id, { command, status: "refreshing" });

		try {
			await this.read(id, signal);
			signal.throwIfAborted();
			this.setOperation(id, null);
		} catch {
			signal.throwIfAborted();
			this.setOperation(id, { command, status: "refresh-failed" });
		}
	}

	async retryRead(id: string) {
		const operation = this.getOperation(id);
		if (!operation) return;

		const signal = this.getSessionSignal();

		if (operation.status === "refresh-failed") {
			await this.refreshConfirmed(id, operation.command, signal);
		}

		if (operation.status === "conflict") await this.read(id, signal);
	}

	discardRejected(id: string) {
		const operation = this.getOperation(id);

		if (operation?.status === "conflict" || operation?.status === "rejected") {
			this.setOperation(id, null);
		}
	}
}
