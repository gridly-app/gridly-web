import { QueryClient } from "@tanstack/react-query";
import { DevelopmentDemoSession } from "@/app/mocks/DevelopmentDemoSession";
import {
	HttpWarehouseRepository,
	RestWarehouseRepository,
} from "@/entities/warehouse";
import { FetchHttpClient } from "@/shared/api";
import { BrowserSessionRepository } from "@/shared/auth";
import { environment } from "@/shared/config";
import { DemoSessionController } from "./DemoSessionController";

export type AppDependencies = ReturnType<typeof createDependencies>;

export function createDependencies() {
	const client = new QueryClient({
		defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: true } },
	});
	const http = new FetchHttpClient(environment.apiBaseUrl);
	const realRepository = new RestWarehouseRepository(http);
	const mockRepository = new HttpWarehouseRepository(
		new FetchHttpClient("/api/v1"),
	);
	const sandbox = new DemoSessionController(sessionStorage);
	const demoSession =
		import.meta.env.DEV && environment.mockApi
			? new DevelopmentDemoSession()
			: sandbox;
	const sessionRepository = new BrowserSessionRepository(
		http,
		localStorage,
		!environment.mockApi,
		demoSession,
	);

	function logout() {
		client.clear();
		realRepository.clear();
	}

	async function restoreSession() {
		if (demoSession.active()) {
			await demoSession.start();
		}
	}

	return {
		client,
		realRepository,
		mockRepository,
		demoRepository: sandbox.repository,
		sessionRepository,
		restoreSession,
		logout,
	};
}
