import type { DemoSession } from "@/shared/auth";
import { environment } from "@/shared/config";

export class DevelopmentDemoSession implements DemoSession {
	active() {
		return environment.demoActive;
	}

	async start() {
		const mocks = await import("./browser");

		mocks.resetDemo();
		sessionStorage.setItem("gridly.demo", "true");
	}

	async stop() {
		const mocks = await import("./browser");

		mocks.leaveDemo();
		sessionStorage.removeItem("gridly.demo");
	}
}
