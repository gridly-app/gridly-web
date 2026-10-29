import { QueryClient } from "@tanstack/react-query";
import { RestWarehouseRepository } from "@/entities/warehouse";
import { FetchHttpClient } from "@/shared/api";
import { BrowserSessionRepository, ServerDemoSession } from "@/shared/auth";
import { environment } from "@/shared/config";
import { availableStorage, browserStorage } from "@/shared/lib/browserStorage";
import { clearFormDraftScope } from "@/shared/lib/forms/formDraftStorage";

export type AppDependencies = ReturnType<typeof createDependencies>;
export function createDependencies() {
	const options = {
		defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: true } },
	};
	const client = new QueryClient(options);
	const demoClient = new QueryClient(options);
	const local = availableStorage("localStorage");
	const session = availableStorage("sessionStorage");
	let sessionRepository: BrowserSessionRepository;
	const http = new FetchHttpClient(environment.apiBaseUrl, undefined, {
		onUnauthorized: () => sessionRepository?.expire(),
	});
	const realRepository = new RestWarehouseRepository(http, client);
	let demoRepository: RestWarehouseRepository;
	const demoSession = new ServerDemoSession(
		session.storage,
		environment.apiBaseUrl,
		() => {
			void demoClient.cancelQueries();
			demoClient.clear();
			demoRepository.clear();
		},
		undefined,
		(sessionId) =>
			clearFormDraftScope(browserStorage("localStorage"), ["demo", sessionId]),
	);
	demoRepository = new RestWarehouseRepository(demoSession.http, demoClient);
	sessionRepository = new BrowserSessionRepository(
		http,
		browserStorage("localStorage"),
		clearAccountData,
	);
	function clearAccountData() {
		void client.cancelQueries();
		client.clear();
		realRepository.clear();
	}
	return {
		client,
		demoClient,
		realRepository,
		demoRepository,
		demoSession,
		sessionRepository,
		localStorage: local.storage,
	};
}
