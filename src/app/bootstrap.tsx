import "./styles/app.css";

import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { createDependencies } from "./composition/dependencies.compose";
import { StartupFailure } from "./StartupFailure";

async function renderApp() {
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

export function bootstrap() {
	return renderApp().catch(() => {
		const element = document.getElementById("root");

		if (element) {
			createRoot(element).render(<StartupFailure />);
		}
	});
}
