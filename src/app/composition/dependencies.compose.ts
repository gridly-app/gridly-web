import { QueryClient } from "@tanstack/react-query";
import {
	AnonymousSandboxAccess,
	accountAuthEndpoints,
	BrowserSessionRepository,
} from "@/app/modules/session";
import { RestWarehouseRepository } from "@/app/modules/warehouse-data";
import { environment } from "@/shared/config";
import { ApiError, FetchHttpClient } from "@/shared/http";
import {
	availableStorage,
	browserStorage,
	runtimeNotices,
} from "@/shared/lib";

export type AppDependencies = ReturnType<typeof createDependencies>;

function createWarehouseRuntime(http: FetchHttpClient) {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: {
				retry: (attempt, error) =>
					attempt < 1 &&
					!(
						error instanceof ApiError && [401, 403, 404].includes(error.status)
					),
				refetchOnWindowFocus: true,
			},
		},
	});
	const repository = new RestWarehouseRepository(http, queryClient);

	return {
		http,
		queryClient,
		repository,
		clear() {
			void queryClient.cancelQueries();
			queryClient.clear();
			repository.clear();
		},
	};
}

function createAccountRuntime() {
	const http = new FetchHttpClient(environment.apiBaseUrl, undefined, {
		auth: accountAuthEndpoints,
		onUnauthorized: () => session.expire(),
		withRefresh: (refresh, signal) => session.withRefresh(refresh, signal),
	});
	const warehouse = createWarehouseRuntime(http);
	const session: BrowserSessionRepository = new BrowserSessionRepository(
		http,
		browserStorage("localStorage"),
		warehouse.clear,
		undefined,
		browserStorage("sessionStorage"),
	);
	return { warehouse, session };
}

function createSandboxRuntime() {
	const access = new AnonymousSandboxAccess(
		availableStorage("sessionStorage").storage,
		environment.apiBaseUrl,
		(accessId) => {
			warehouse.clear();

			if (accessId) clearSandboxAttempts(accessId);
		},
	);
	const warehouse = createWarehouseRuntime(access.http);
	return { warehouse, access };
}

export function createDependencies() {
	return {
		account: createAccountRuntime(),
		sandbox: createSandboxRuntime(),
		localStorage: availableStorage("localStorage").storage,
	};
}

function clearSandboxAttempts(accessId: string) {
	const quotedId = JSON.stringify(accessId);
	const prefixes = [
		`gridly.guest-link-attempt:["sandbox",${quotedId},`,
		`gridly.shipment-attempt:["sandbox",${quotedId},`,
	];

	try {
		const storage = window.sessionStorage;
		const keys = Object.keys(storage);

		for (const key of keys) {
			if (prefixes.some((prefix) => key.startsWith(prefix)))
				storage.removeItem(key);
		}
	} catch {
		runtimeNotices.report(
			"sandbox.attempts",
			"Не удалось удалить данные незавершённых операций песочницы.",
		);
	}
}
