import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "@/app/App";
import { createDependencies } from "@/app/composition/dependencies";
import { StartupFailure } from "@/app/StartupFailure";
import "@/app/styles/app.css";

async function bootstrap() {
	const dependencies = createDependencies();

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
