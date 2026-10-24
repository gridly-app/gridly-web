import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "@/app/App";
import { createDependencies } from "@/app/composition/dependencies";
import { StartupFailure } from "@/app/StartupFailure";
import { environment } from "@/shared/config";
import "@/app/styles/app.css";

async function bootstrap() {
	if (import.meta.env.DEV && environment.mockApi) {
		const { startMocks } = await import("@/app/mocks/browser");

		await startMocks();
	}
	const dependencies = createDependencies();

	await dependencies.restoreSession();
	const element = document.getElementById("root");

	if (!element) {
		throw new Error("Application root not found");
	}
	createRoot(element).render(
		<React.StrictMode>
			<App dependencies={dependencies} />
		</React.StrictMode>,
	);
}

void bootstrap().catch(() => {
	const element = document.getElementById("root");

	if (element) {
		createRoot(element).render(<StartupFailure />);
	}
});
