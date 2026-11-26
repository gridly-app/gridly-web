import { createSnapshotStore } from "./snapshotStore";

class RuntimeNotices {
	private messages = new Map<string, string>();
	private dismissed = new Set<string>();
	private store = createSnapshotStore<readonly string[]>([]);
	getSnapshot = this.store.getSnapshot;
	subscribe = this.store.subscribe;
	report(key: string, message: string) {
		if (this.messages.get(key) === message) return;
		this.messages.set(key, message);
		this.publish();
	}
	dismiss(message: string) {
		this.dismissed.add(message);
		this.publish();
	}
	private publish() {
		const visible = [...new Set(this.messages.values())].filter(
			(message) => !this.dismissed.has(message),
		);

		this.store.publish(visible);
	}
}

export const runtimeNotices = new RuntimeNotices();
