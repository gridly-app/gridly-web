export type StatusTone =
	"accent" | "warning" | "danger" | "neutral" | "success";

const statusTones: Record<string, StatusTone> = {
	active: "accent",
	running: "accent",
	in_progress: "accent",
	moving: "accent",
	working: "accent",
	carrying: "accent",
	waiting: "warning",
	waiting_confirmation: "warning",
	awaiting_load: "warning",
	charging: "warning",
	blocked: "danger",
	expired: "danger",
	unavailable: "danger",
	received_with_losses: "danger",
	received: "success",
	shipped: "success",
	completed: "success",
	available: "success",
	ready: "success",
	Годно: "success",
};

export function statusTone(status: string): StatusTone {
	return statusTones[status] ?? "neutral";
}
