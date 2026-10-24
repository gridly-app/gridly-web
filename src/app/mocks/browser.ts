import { HttpResponse, http } from "msw";
import { setupWorker } from "msw/browser";
import { z } from "zod";
import { seed } from "@/app/demo/fixtures/seed";
import { DemoTicker } from "@/app/demo/services/DemoTicker";
import { ApiError } from "@/shared/api";
import { environment } from "@/shared/config";
import { errorMessage } from "@/shared/lib";
import { AuthService } from "./services/AuthService";
import { DemoSessionStore } from "./services/DemoSessionStore";
import { LocalMockStore } from "./services/MockStore";
import { warehouseHandlers } from "./warehouseHandlers";

const store = new DemoSessionStore(
	new LocalMockStore(localStorage, seed),
	seed,
	environment.demoActive ||
		(environment.mockApi && localStorage.getItem("gridly.user") === "demo"),
);

for (const warehouse of store.listWarehouses()) {
	if (warehouse.demoVersion) {
		warehouse.running = false;
		store.saveWarehouse(warehouse);
	}
}

const auth = new AuthService(store);

const ticker = new DemoTicker(store);

function failure(error: unknown, status = 409) {
	return HttpResponse.json(
		{ error: { message: errorMessage(error) } },
		{ status: error instanceof ApiError ? error.status : status },
	);
}

const worker = setupWorker(
	...warehouseHandlers(store),
	http.post("/api/v1/auth/:mode", async ({ params, request }) => {
		try {
			if (params.mode !== "login" && params.mode !== "register") {
				return failure(Error("Неизвестная операция входа"), 400);
			}

			const credentials = z
				.object({ login: z.string(), password: z.string() })
				.parse(await request.json());
			const result = await auth.authenticate(params.mode, credentials);

			if (params.mode === "login" && credentials.login === "demo") {
				store.enterDemo();
			} else {
				store.enterWorkspace();
			}

			return HttpResponse.json(result);
		} catch (error) {
			return failure(error);
		}
	}),
);

export async function startMocks() {
	if (!import.meta.env.DEV) {
		throw new Error("Mock API разрешён только в режиме разработки");
	}
	await worker.start({ onUnhandledRequest: "bypass" });
	ticker.start();
}

export function resetDemo() {
	store.enterDemo();
}

export function leaveDemo() {
	store.enterWorkspace();
}

export function stopMocks() {
	ticker.stop();
	worker.stop();
}

if (import.meta.hot) {
	import.meta.hot.dispose(stopMocks);
}
