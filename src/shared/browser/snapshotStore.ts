export interface SnapshotStore<Snapshot> {
	getSnapshot(): Snapshot;
	subscribe(listener: () => void): () => void;
	publish(snapshot: Snapshot): void;
}

interface SubscriberLifecycle {
	onFirstSubscribe?(): void;
	onLastUnsubscribe?(): void;
}

export function createSnapshotStore<Snapshot>(
	initial: Snapshot,
	lifecycle: SubscriberLifecycle = {},
): SnapshotStore<Snapshot> {
	let snapshot = initial;
	const listeners = new Set<() => void>();

	function subscribe(listener: () => void) {
		if (!listeners.size) lifecycle.onFirstSubscribe?.();

		listeners.add(listener);

		return () => {
			listeners.delete(listener);

			if (!listeners.size) lifecycle.onLastUnsubscribe?.();
		};
	}

	function publish(next: Snapshot) {
		snapshot = next;

		for (const listener of listeners) listener();
	}

	return { getSnapshot: () => snapshot, subscribe, publish };
}
