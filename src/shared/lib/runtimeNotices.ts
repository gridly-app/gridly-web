class RuntimeNotices {
	private messages = new Map<string, string>();
	private snapshot: readonly string[] = [];
	private dismissed = new Set<string>();
	private listeners = new Set<() => void>();
	getSnapshot = () => this.snapshot;
	subscribe = (listener: () => void) => {
		this.listeners.add(listener);
		return () => {
			this.listeners.delete(listener);
		};
	};
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
		this.snapshot = [...new Set(this.messages.values())].filter(
			(message) => !this.dismissed.has(message),
		);
		for (const listener of this.listeners) listener();
	}
}
export const runtimeNotices = new RuntimeNotices();
