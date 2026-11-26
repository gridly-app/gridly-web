import type { QueryClient } from "@tanstack/react-query";
import type { LayoutCommand } from "@/domain/warehouse";
import { blocksLayoutWrite, type LayoutOperation } from "@/ports/warehouse";
import { ApiError } from "@/shared/http";
import { UserError } from "@/shared/invariants";
import {
	layoutOperationNamespace,
	type WarehouseKeys,
} from "../queries/queryKeys";

import { layoutIssues } from "./layoutIssues";

const replayLifetimeMs = 24 * 60 * 60 * 1000;

type RetryCommit = () => Promise<unknown>;

const rejectedStatuses = new Set([400, 401, 403, 404, 405, 422]);

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
	if (!(error instanceof ApiError)) return "unknown";
	if (rejectedStatuses.has(error.status) || error.code === "STATIC_MOCK")
		return "rejected";

	return "unknown";
}

export class LayoutResource {
	private readonly retries = new Map<
		string,
		{ send: RetryCommit; expiresAt: number }
	>();

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

	clear() {
		this.retries.clear();
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
		write: (
			command: LayoutCommand,
			markSent: (retry?: RetryCommit) => void,
		) => Promise<void>,
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
			await write(command, (retry) => {
				sent = true;

				if (retry && !this.retries.has(id)) {
					this.retries.set(id, {
						send: retry,
						expiresAt: Date.now() + replayLifetimeMs,
					});
				}
			});
			signal.throwIfAborted();
		} catch (error) {
			if (!signal.aborted)
				await this.recordFailure(id, command, signal, error, sent);

			throw error;
		}

		this.retries.delete(id);
		await this.refreshConfirmed(id, command, signal);
	}

	private async recordFailure(
		id: string,
		command: LayoutCommand,
		signal: AbortSignal,
		error: unknown,
		sent: boolean,
	) {
		const status = rejectedStatus(error, sent);
		const issues = layoutIssues(error);
		const operation = issues.length
			? { command, status, issues }
			: { command, status };

		if (status !== "unknown") this.retries.delete(id);

		this.setOperation(id, operation);

		if (status === "conflict")
			await this.read(id, signal).catch(() => undefined);
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

		if (
			operation.status === "unknown" &&
			operation.command.action === "saveMap"
		) {
			const retry = this.retries.get(id);

			if (!retry || Date.now() >= retry.expiresAt) {
				throw new UserError(
					"Срок безопасного повтора истёк. Сверьте планировку с сохранённым снимком.",
				);
			}

			this.setOperation(id, null);

			await this.execute(id, operation.command, async (_command, markSent) => {
				markSent();
				await retry.send();
			});

			return operation.command;
		}

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
