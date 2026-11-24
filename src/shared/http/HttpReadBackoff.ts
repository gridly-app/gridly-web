const maxTimerDelay = 2 ** 31 - 1;

export class HttpReadBackoff {
	private readonly retryAt = new Map<string, number>();

	clear() {
		this.retryAt.clear();
	}

	has(path: string) {
		return this.retryAt.has(path);
	}

	defer(path: string, delay: number) {
		const retryAt = Date.now() + delay;

		this.retryAt.set(path, Math.max(this.retryAt.get(path) ?? 0, retryAt));
	}

	async wait(path: string, signal?: AbortSignal) {
		let retryAt = this.retryAt.get(path);

		while (retryAt !== undefined) {
			const delay = retryAt - Date.now();

			if (delay <= 0) {
				this.retryAt.delete(path);
				return;
			}

			await waitForReadDelay(Math.min(delay, maxTimerDelay), signal);
			retryAt = this.retryAt.get(path);
		}
	}
}

async function waitForReadDelay(delay: number, signal?: AbortSignal) {
	signal?.throwIfAborted();

	await new Promise<void>((resolve, reject) => {
		const timer = setTimeout(() => {
			signal?.removeEventListener("abort", abort);
			resolve();
		}, delay);

		function abort() {
			clearTimeout(timer);
			reject(signal?.reason);
		}

		signal?.addEventListener("abort", abort, { once: true });
	});
}
